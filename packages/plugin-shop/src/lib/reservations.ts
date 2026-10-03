import type { Payload, PayloadRequest } from 'payload'
import { getLineItemType, type StockUnit } from '@buildmyrig/lib'

/**
 * Inventory reservations (audit gap P2-C6): a hold per payment initiation so
 * two buyers can't both reserve the last unit while one payment is in flight.
 *
 * Lifecycle — stock is only ever decremented at settlement; a hold is a
 * bookkeeping row, releasing it never restocks:
 * - create  at initiatePayment (wrapped adapter, `wrapWithReservations`)
 * - release on payment_failed / payment_intent.canceled / expiry sweep
 * - convert at settlement: webhook-wins → units were decremented by the
 *   settlement loop (`decrementComposite: false`); poll-wins → the upstream
 *   poll only ever decremented standard lines (patched decrementInventory
 *   skips composite), so conversion decrements the composite units here
 *   (`decrementComposite: true`).
 *
 * Everything is best-effort: a reservation hiccup must never break a payment.
 */

export const RESERVATION_TTL_MS = 30 * 60 * 1000

/** Page cap for the availability read — hitting it is logged, never silent. */
export const HELD_QUERY_LIMIT = 1000

const RESERVATIONS = 'inventory-reservations'

type ReservationItem = StockUnit & { lineType?: string }

const relId = (v: unknown): string | number | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'object' && 'id' in v) return (v as { id: string | number }).id
  return v as string | number
}

/** Release every expired hold — called lazily before creating a new one. */
const sweepExpired = async (payload: Payload, req: PayloadRequest): Promise<void> => {
  await payload.update({
    collection: RESERVATIONS as never,
    where: { and: [{ status: { equals: 'held' } }, { expiresAt: { less_than: new Date().toISOString() } }] } as never,
    data: { status: 'released' } as never,
    overrideAccess: true,
    req,
  })
}

/**
 * C4: one live hold per cart. A double-submit creates a second PaymentIntent
 * for the same cart; without this the first hold would keep counting against
 * availability until it expired.
 */
const releaseHeldForCart = async (
  payload: Payload,
  req: PayloadRequest,
  cartId: string | number,
): Promise<void> => {
  await payload.update({
    collection: RESERVATIONS as never,
    where: { and: [{ cart: { equals: cartId } }, { status: { equals: 'held' } }] } as never,
    // 'superseded' — not 'released': the hold is replaced by a newer hold for
    // the same cart, not released by a failed/cancelled payment.
    data: { status: 'superseded' } as never,
    overrideAccess: true,
    req,
  })
}

/**
 * Flattens cart lines into final decrement amounts (composite units are
 * pre-multiplied by line quantity) and stores the hold. Lines whose stock
 * cannot be resolved contribute no units — same policy as settlement.
 */
export const createReservationFromCart = async ({
  payload,
  req,
  cart,
  paymentIntentID,
}: {
  payload: Payload
  req: PayloadRequest
  cart: { id?: string | number; items?: unknown } | null | undefined
  paymentIntentID: string
}): Promise<void> => {
  if (!paymentIntentID || !cart?.id) return
  await sweepExpired(payload, req)
  await releaseHeldForCart(payload, req, cart.id)
  const items: ReservationItem[] = []
  for (const raw of Array.isArray(cart.items) ? cart.items : []) {
    const item = raw as { lineType?: string; product?: unknown; variant?: unknown; quantity?: number }
    const lineType = typeof item.lineType === 'string' && item.lineType ? item.lineType : 'standard'
    const qty = typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1
    if (lineType === 'standard') {
      const variant = relId(item.variant)
      const product = relId(item.product)
      const target = variant ?? product
      if (target === null) continue
      items.push(
        variant !== null
          ? { lineType, variant, quantity: qty }
          : { lineType, product: target, quantity: qty },
      )
      continue
    }
    const type = getLineItemType(lineType)
    if (!type?.resolveStockUnits) {
      payload.logger.warn(`[reservation] line type '${lineType}' has no resolveStockUnits — units not held`)
      continue
    }
    try {
      const units = await type.resolveStockUnits(item as never, payload)
      for (const unit of units) {
        const unitQty = typeof unit.quantity === 'number' && Number.isFinite(unit.quantity) && unit.quantity > 0 ? unit.quantity : 1
        const target = unit.variant ?? unit.product
        if (target === null || target === undefined || target === '') continue
        items.push(
          unit.variant != null
            ? { lineType, variant: unit.variant, quantity: unitQty * qty }
            : { lineType, product: target, quantity: unitQty * qty },
        )
      }
    } catch (err) {
      payload.logger.warn(`[reservation] resolveStockUnits failed for '${lineType}': ${String(err)}`)
    }
  }
  await payload.create({
    collection: RESERVATIONS as never,
    data: {
      paymentIntentID,
      cart: cart.id as never,
      status: 'held',
      items: items as never,
      expiresAt: new Date(Date.now() + RESERVATION_TTL_MS).toISOString(),
    } as never,
    req,
  })
}

/** payment_failed / payment_intent.canceled / expiry — hold stops counting. */
export const releaseReservations = async (
  payload: Payload,
  req: PayloadRequest,
  paymentIntentID: string,
): Promise<void> => {
  if (!paymentIntentID) return
  await payload.update({
    collection: RESERVATIONS as never,
    where: { and: [{ paymentIntentID: { equals: paymentIntentID } }, { status: { equals: 'held' } }] } as never,
    data: { status: 'released' } as never,
    overrideAccess: true,
    req,
  })
}

/**
 * Settlement conversion. `decrementComposite` is true only on the poll-wins
 * paths (transaction already succeeded / order exists): the upstream poll
 * decremented standard lines, so conversion settles the composite units.
 *
 * Claimable statuses are `held`, `released` and `superseded` — a hold that was
 * superseded by a re-initiate or swept on expiry is still the only record of
 * that PaymentIntent's composite units, and a late settlement must still
 * decrement them. Availability counts `held` only, so a released hold never
 * blocks a sale. At-most-once: the CAS flips the status to `converted`.
 */
export const convertReservation = async (
  payload: Payload,
  req: PayloadRequest,
  paymentIntentID: string,
  { decrementComposite }: { decrementComposite: boolean },
): Promise<void> => {
  if (!paymentIntentID) return
  try {
    const claimable = ['held', 'released', 'superseded']
    const result = await payload.find({
      collection: RESERVATIONS as never,
      where: {
        and: [{ paymentIntentID: { equals: paymentIntentID } }, { status: { in: claimable } }],
      } as never,
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const reservation = result.docs[0] as { id: string | number; items?: ReservationItem[] } | undefined
    if (!reservation) return
    // Atomic claim BEFORE any decrement: Stripe can deliver the same event
    // concurrently, and two racers both reading a claimable status would
    // double-decrement composite stock. Same CAS pattern as the transaction
    // state machine.
    const claimed = await payload.db.updateOne({
      collection: RESERVATIONS,
      data: { status: 'converted' },
      options: { atomic: true },
      req,
      where: {
        and: [{ id: { equals: reservation.id } }, { status: { in: claimable } }],
      },
    } as never)
    if (!claimed) return
    if (decrementComposite) {
      for (const unit of Array.isArray(reservation.items) ? reservation.items : []) {
        if (unit.lineType === 'standard' || unit.lineType === undefined) continue
        const target = unit.variant ?? unit.product
        if (target === null || target === undefined || target === '') continue
        await decrementStock(payload, unit.variant != null ? 'variants' : 'products', target, unit.quantity, payload.logger, req)
      }
    }
  } catch (err) {
    payload.logger.warn(`[reservation] conversion failed for ${paymentIntentID}: ${String(err)}`)
  }
}

/**
 * Guarded decrement: pre-checks stock and logs loudly on oversell, then
 * decrements anyway — the payment is captured, so an accurate negative
 * ledger beats a hidden shortfall (ops reconciles; see 01-commerce.md).
 */
export const decrementStock = async (
  payload: Payload,
  collection: string,
  targetId: string | number,
  by: number,
  logger: Pick<Payload['logger'], 'warn' | 'error'>,
  req?: PayloadRequest,
): Promise<void> => {
  let current: number | null = null
  try {
    const doc = (await payload.findByID({
      collection: collection as never,
      id: targetId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as { inventory?: number | null } | null
    if (doc && typeof doc.inventory === 'number' && Number.isFinite(doc.inventory)) current = doc.inventory
  } catch {
    // Unreadable target — decrement blind; the atomic update below still reports.
  }
  if (current !== null && current < by) {
    logger.error(
      `[stock] oversell: ${collection} ${String(targetId)} has ${current}, settling ${by} — inventory goes negative; reconcile`,
    )
  }
  const updated = await payload.db.updateOne({
    id: targetId,
    collection: collection as never,
    data: { inventory: { $inc: by * -1 } },
    req,
  } as never)
  if (!updated) {
    throw new Error(`[stock] decrement failed: ${collection} ${String(targetId)} not updated`)
  }
}

/**
 * Active holds per stock target (`variant:<id>` / `product:<id>`), summed
 * across unexpired held reservations — the availability side of the guard.
 * Pass `targets` to scope the query to the cart's own SKUs (C4): the read
 * stays bounded regardless of how many carts are mid-checkout. Throws on
 * collection errors; callers fail open.
 */
export const heldQuantities = async (
  payload: Payload,
  req: PayloadRequest,
  targets?: { variantIds: Array<string | number>; productIds: Array<string | number> },
  limit: number = HELD_QUERY_LIMIT,
): Promise<Map<string, number>> => {
  const conditions: unknown[] = [
    { status: { equals: 'held' } },
    { expiresAt: { greater_than: new Date().toISOString() } },
  ]
  if (targets) {
    if (targets.variantIds.length === 0 && targets.productIds.length === 0) {
      // Composite-only cart: nothing to cap, so skip the query entirely.
      return new Map<string, number>()
    }
    const or: unknown[] = []
    if (targets.variantIds.length > 0) or.push({ 'items.variant': { in: targets.variantIds } })
    if (targets.productIds.length > 0) or.push({ 'items.product': { in: targets.productIds } })
    conditions.push({ or })
  }
  const result = await payload.find({
    collection: RESERVATIONS as never,
    where: { and: conditions } as never,
    limit,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (typeof result.totalDocs === 'number' && result.totalDocs > result.docs.length) {
    payload.logger.warn(
      `[reservation] availability read hit its page cap (${result.docs.length}/${result.totalDocs} held reservations) — held counts may be under-reported`,
    )
  }
  const held = new Map<string, number>()
  for (const raw of result.docs as Array<{ items?: ReservationItem[] }>) {
    for (const unit of Array.isArray(raw.items) ? raw.items : []) {
      const target = unit.variant ?? unit.product
      if (target === null || target === undefined || target === '') continue
      const key = `${unit.variant != null ? 'variant' : 'product'}:${String(target)}`
      held.set(key, (held.get(key) ?? 0) + (unit.quantity || 0))
    }
  }
  return held
}

/**
 * Wraps the stripe adapter's `initiatePayment`: after the upstream handler
 * returns a PaymentIntent, record the hold. Best-effort — a reservation
 * failure logs a warning and never breaks the payment. Method syntax keeps
 * the parameter check bivariant so the adapter's concrete args type fits.
 */
interface WithInitiatePayment {
  initiatePayment(args: {
    req?: PayloadRequest
    data?: { cart?: { id?: string | number; items?: unknown } | null }
    [key: string]: unknown
  }): Promise<unknown>
}

export const wrapWithReservations = <P extends WithInitiatePayment>(paymentMethod: P): P =>
  ({
    ...paymentMethod,
    initiatePayment: async (args) => {
      const result = (await paymentMethod.initiatePayment(args)) as { paymentIntentID?: string } | undefined
      const paymentIntentID = result?.paymentIntentID
      if (paymentIntentID) {
        try {
          const payload = args.req?.payload
          const cart = args.data?.cart
          if (payload && cart) {
            await createReservationFromCart({
              payload,
              req: args.req as PayloadRequest,
              cart,
              paymentIntentID,
            })
          }
        } catch (err) {
          args.req?.payload?.logger?.warn?.(
            `[reservation] could not record hold for ${paymentIntentID}: ${String(err)}`,
          )
        }
      }
      return result
    },
  }) as P

import type { Payload, PayloadRequest } from 'payload'
import { randomUUID } from 'node:crypto'
import { getLineItemType } from '@buildmyrig/lib'
import { convertReservation, decrementStock, releaseReservations } from '../lib/reservations.ts'

/**
 * Stripe webhook handlers — Phase 4 "webhook idempotency" (12-integrations-ops.md).
 *
 * The ecommerce `confirmOrder` poll finalizes an order only while the client
 * is still on the redirect page. These handlers are the reliable path: Stripe
 * delivers the payment events server-side regardless of what the browser did.
 *
 * Idempotency: Stripe can deliver any event more than once. Instead of an
 * event-id store, every transition is guarded by a compare-and-set on the
 * transaction's state machine (mirroring plugin-ecommerce's private
 * `finalizeTransactionOrder`: claim `pending → processing` with
 * `order exists:false`, then settle to `succeeded`). A replay hits the guard,
 * sees a settled state, and no-ops — same replay safety the plan asked for.
 * Events that arrive while a settlement is mid-flight (`processing`, no
 * order) are logged and skipped rather than re-driven, because re-driving
 * could create a second order; interrupted settlements are recovered by ops.
 *
 * Wire-up: `webhooks` prop of `stripeAdapter` in plugin-shop/src/index.ts.
 * Only registered when STRIPE_SECRET_KEY is set (inactive in keyless dev).
 */

type WebhookEvent = {
  id?: string
  type?: string
  data?: { object?: Record<string, any> }
}

type WebhookArgs = {
  event?: WebhookEvent
  req: PayloadRequest
}

type Logger = Pick<Payload['logger'], 'info' | 'warn' | 'error'>

const ORDERS = 'orders'
const TRANSACTIONS = 'transactions'
const CARTS = 'carts'
const PRODUCTS = 'products'
const VARIANTS = 'variants'

const parseJson = <T>(raw: unknown): T | null => {
  if (typeof raw !== 'string' || !raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const findTransactionByPaymentIntent = async (
  payload: Payload,
  req: PayloadRequest,
  paymentIntentID: string,
): Promise<Record<string, any> | null> => {
  const result = await payload.find({
    collection: TRANSACTIONS,
    depth: 0,
    limit: 2,
    pagination: false,
    req,
    where: { 'stripe.paymentIntentID': { equals: paymentIntentID } } as never,
  })
  if (result.totalDocs > 1) {
    // Ambiguous state: refuse to guess which transaction to settle.
    payload.logger.error(
      `[stripe-webhook] multiple transactions reference payment intent ${paymentIntentID} — manual review required`,
    )
    return null
  }
  return (result.docs[0] as Record<string, any>) ?? null
}

const paymentIntentIdOf = (event: WebhookEvent): string | null => {
  const object = event.data?.object
  if (!object || typeof object.id !== 'string' || !object.id) return null
  // charge.* events carry the PI id on `payment_intent`, not `id`.
  if (object.id.startsWith('pi_')) return object.id
  const pi = object.payment_intent
  if (typeof pi === 'string' && pi) return pi
  if (pi && typeof pi === 'object' && typeof (pi as { id?: unknown }).id === 'string') {
    return (pi as { id: string }).id
  }
  return null
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * A settled/paid transaction's idempotent post-steps: discount usage (CAS
 * marker) + reservation conversion. `decrementComposite` is driven by the
 * transaction's `inventoryComplete` marker: the webhook's own decrement loop
 * sets it (composite units already decremented → bookkeeping-only); the
 * upstream confirmOrder poll never sets it (it skips composite lines → the
 * conversion must decrement them).
 */
const postSettleSteps = async (
  payload: Payload,
  req: PayloadRequest,
  paymentIntentID: string,
  transaction: Record<string, any>,
): Promise<void> => {
  await countDiscountUsage({
    payload,
    req,
    transactionId: transaction.id,
    cartId: transaction.cart,
    discountCodeApplied: transaction.discountCodeApplied,
  })
  await convertReservation(payload, req, paymentIntentID, {
    decrementComposite: transaction.inventoryComplete !== true,
  })
}

/**
 * A6: count one use of the cart's applied discount code. At-most-once via a
 * CAS on the transaction's `discountCounted` marker (entry 32 review F2):
 * the upstream `confirmOrder` poll can settle a payment without ever counting
 * usage, and Stripe can deliver `payment_intent.succeeded` concurrently — the
 * marker makes every settlement path (webhook claim, poll-wins, repair) safe
 * to call this. Never throws: usage counting must not abort a settled payment.
 *
 * Entry 44 review (I3): the code counted is the one snapshotted on the
 * transaction at initiation (`discountCodeApplied`) — the cart can be edited
 * while the PaymentIntent is in flight, so reading `cart.discountCode` at
 * settle time could count a code that was never priced into the charge.
 */
const countDiscountUsage = async ({
  payload,
  req,
  transactionId,
  cartId,
  discountCodeApplied,
}: {
  payload: Payload
  req: PayloadRequest
  transactionId: unknown
  cartId: unknown
  discountCodeApplied?: unknown
}): Promise<void> => {
  if (transactionId === null || transactionId === undefined || transactionId === '') return
  try {
    let codeId =
      discountCodeApplied && typeof discountCodeApplied === 'object'
        ? (discountCodeApplied as { id?: unknown }).id
        : discountCodeApplied
    if ((codeId === null || codeId === undefined || codeId === '') && cartId !== null && cartId !== undefined && cartId !== '') {
      // No snapshot (pre-entry-44 transaction): fall back to the cart's code.
      const cart = (await payload.findByID({
        collection: CARTS,
        id: cartId as string | number,
        depth: 0,
        overrideAccess: true,
        req,
      })) as { discountCode?: unknown } | null
      codeId =
        cart?.discountCode && typeof cart.discountCode === 'object'
          ? (cart.discountCode as { id?: unknown }).id
          : cart?.discountCode
    }
    if (codeId === null || codeId === undefined || codeId === '') return
    // Claim the marker first: a crash between claim and increment under-counts
    // (recoverable by ops) rather than double-counting a customer's code.
    // `exists: false` covers rows created before the marker column existed —
    // SQL evaluates `!= true` as NULL for those and would never match.
    const claimed = await payload.db.updateOne({
      collection: TRANSACTIONS,
      data: { discountCounted: true },
      options: { atomic: true },
      req,
      where: {
        and: [
          { id: { equals: transactionId } },
          {
            or: [
              { discountCounted: { not_equals: true } },
              { discountCounted: { exists: false } },
            ],
          },
        ],
      },
    } as never)
    if (!claimed) return
    // Entry 44 review (I3): the increment honours `maxUses` atomically — a
    // check-time validation can't stop two carts consuming the last use.
    const code = (await payload.findByID({
      collection: 'discount-codes',
      id: codeId as string | number,
      depth: 0,
      overrideAccess: true,
      req,
    }).catch(() => null)) as { maxUses?: number | null } | null
    const hasCap = typeof code?.maxUses === 'number'
    const bumped = await payload.db.updateOne({
      collection: 'discount-codes',
      data: { usedCount: { $inc: 1 } },
      options: { atomic: true },
      req,
      where: hasCap
        ? { and: [{ id: { equals: codeId } }, { usedCount: { less_than: code!.maxUses } }] }
        : { id: { equals: codeId } },
    } as never)
    if (!bumped) {
      payload.logger.warn(
        `[stripe-webhook] discount ${String(codeId)} at maxUses — marker set, usage not incremented (overshoot prevented)`,
      )
    }
  } catch (err) {
    payload.logger.warn(`[stripe-webhook] discount usage count failed: ${String(err)}`)
  }
}

/**
 * Mirrors plugin-ecommerce's private `finalizeTransactionOrder` (not exported):
 * claim → create order → mark cart purchased → decrement inventory → settle.
 */
const settlePaymentIntent = async ({ event, req }: WebhookArgs): Promise<void> => {
  const payload = req.payload
  const logger: Logger = payload.logger
  const paymentIntentID = paymentIntentIdOf(event ?? {})
  if (!paymentIntentID) {
    logger.warn('[stripe-webhook] payment_intent event without id — ignored')
    return
  }

  const transaction = await findTransactionByPaymentIntent(payload, req, paymentIntentID)
  if (!transaction) {
    logger.info(`[stripe-webhook] no transaction for payment intent ${paymentIntentID} — ignored`)
    return
  }
  if (transaction.status === 'succeeded') {
    // Poll-wins or a completed webhook settlement: run the idempotent
    // post-steps (discount marker + reservation conversion).
    await postSettleSteps(payload, req, paymentIntentID, transaction)
    return
  }
  if (transaction.order) {
    // Order exists but status lagged (crash between create and settle): repair.
    await payload.update({
      id: transaction.id,
      collection: TRANSACTIONS,
      data: { status: 'succeeded' },
      req,
    })
    await postSettleSteps(payload, req, paymentIntentID, transaction)
    return
  }

  // Claim: `pending`, or `processing` only when stale (>60s — the previous
  // settlement attempt died). The atomic where-update is a single-statement
  // conditional write on drizzle (options.atomic + join-free predicates), so
  // two concurrent deliveries can't both win. The claim also writes a
  // fencing token: a re-claim steals the token, and the displaced worker's
  // per-line CAS then fails instead of double-decrementing (#286).
  const staleBefore = new Date(Date.now() - 60_000).toISOString()
  const claimToken = randomUUID()
  const claimed = await payload.db.updateOne({
    collection: TRANSACTIONS,
    data: { status: 'processing', settlementToken: claimToken },
    options: { atomic: true },
    req,
    where: {
      and: [
        { id: { equals: transaction.id } },
        { order: { exists: false } },
        {
          or: [
            { status: { equals: 'pending' } },
            {
              and: [
                { status: { equals: 'processing' } },
                { updatedAt: { less_than: staleBefore } },
              ],
            },
          ],
        },
      ],
    },
  } as never)
  if (!claimed) {
    // A competitor (Stripe redelivery or the upstream confirmOrder poll) is
    // mid-settlement. A lost claim must not blindly ACK the only copy of the
    // event (entry 44 review I1): give it a bounded moment to land, then run
    // the idempotent post-steps ourselves. If it wedges at 'processing', the
    // stale-claim window lets the next related event resume it.
    let latest: Record<string, any> | null = null
    for (let attempt = 0; attempt < 4; attempt++) {
      await sleep(250)
      latest = (await payload.findByID({
        collection: TRANSACTIONS,
        id: transaction.id,
        depth: 0,
        overrideAccess: true,
        req,
      }).catch(() => null)) as Record<string, any> | null
      if (latest && (latest.status === 'succeeded' || latest.order)) break
    }
    if (latest?.status === 'succeeded') {
      await postSettleSteps(payload, req, paymentIntentID, latest)
    } else if (latest?.order) {
      await payload.update({
        id: transaction.id,
        collection: TRANSACTIONS,
        data: { status: 'succeeded' },
        req,
      })
      await postSettleSteps(payload, req, paymentIntentID, latest)
    } else {
      logger.warn(
        `[stripe-webhook] transaction ${String(transaction.id)} not claimable (state '${String(transaction.status)}') for ${paymentIntentID} — settlement deferred; stale-claim recovery after 60s`,
      )
    }
    return
  }

  // From here a crash must NOT silently wedge: rethrow → the endpoint 500s →
  // Stripe retries, and the stale-claim predicate lets the retry resume.
  try {
    const object = event?.data?.object ?? {}
    const metadata = (object.metadata ?? {}) as Record<string, unknown>
    const snapshotItems = parseJson<Record<string, unknown>[]>(metadata.cartItemsSnapshot)
    const items = Array.isArray(snapshotItems) && snapshotItems.length > 0
      ? snapshotItems
      : (transaction.items as Record<string, unknown>[])
    const shippingAddress = parseJson<Record<string, unknown>>(metadata.shippingAddress) ?? undefined
    const totalsSnapshot = (transaction.totalsSnapshot ?? null) as {
      subtotal?: number
      discountTotal?: number
      shippingTotal?: number
      taxTotal?: number
    } | null

    // Orphan-order reuse (entry 44 review I2): a crash between order create
    // and the transaction link leaves an order already pointing back at this
    // transaction — reuse it instead of creating a second one.
    let order: { id: string | number } | null = null
    const orphans = await payload.find({
      collection: ORDERS,
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      req,
      where: { transactions: { contains: transaction.id } } as never,
    })
    if (orphans.docs.length > 0) {
      order = orphans.docs[0] as { id: string | number }
      logger.warn(`[stripe-webhook] reusing orphan order ${String(order.id)} for ${paymentIntentID}`)
    } else {
      order = await payload.create({
        collection: ORDERS,
        data: {
          amount: typeof object.amount === 'number' ? object.amount : transaction.amount,
          // Store prices/orders are EUR-only; the orders currency select carries
          // that literal type, so narrow Stripe's passthrough value.
          currency: String(object.currency ?? transaction.currency ?? 'EUR').toUpperCase() as 'EUR',
          ...(transaction.customer
            ? { customer: transaction.customer }
            : { customerEmail: transaction.customerEmail }),
          // Snapshot shape matches the cart line type at runtime (product/variant/
          // quantity/lineType/custom fields) — same source the confirm poll uses.
          items: items as never,
          shippingAddress,
          status: 'processing',
          transactions: [transaction.id],
          // Order-level breakdown + applied code (entry 44 review I4): from the
          // charge-time transaction snapshot, not the mutable cart.
          discountCode: transaction.discountCodeApplied ?? null,
          subtotal: totalsSnapshot?.subtotal ?? null,
          discountTotal: totalsSnapshot?.discountTotal ?? null,
          shippingTotal: totalsSnapshot?.shippingTotal ?? null,
          taxTotal: totalsSnapshot?.taxTotal ?? null,
        } as never,
        req,
      })
    }

    if (transaction.cart) {
      await payload.update({
        id: transaction.cart,
        collection: CARTS,
        data: { purchasedAt: new Date().toISOString() },
        req,
      })
    }

    const decrement = async (collection: string, targetId: unknown, by: number): Promise<void> => {
      // Guarded decrement (audit gap P2-C6): pre-checks stock, logs loudly on
      // oversell, then decrements anyway — the payment is captured, so an
      // accurate negative ledger beats a hidden shortfall.
      await decrementStock(payload, collection, targetId as string | number, by, logger, req)
    }

    // Resumable decrement loop (entry 44 review I2): `inventoryProgress` marks
    // completed lines so a crash mid-loop resumes instead of re-decrementing.
    const startAt =
      typeof transaction.inventoryProgress === 'number' && transaction.inventoryProgress > 0
        ? transaction.inventoryProgress
        : 0
    for (let i = startAt; i < items.length; i++) {
      // Fence: re-assert claim ownership before consuming the next line —
      // a re-claimer stole the token if this returns null (entry 44).
      const stillOwned = await payload.db.updateOne({
        collection: TRANSACTIONS,
        data: { inventoryProgress: i },
        options: { atomic: true },
        req,
        where: {
          and: [
            { id: { equals: transaction.id } },
            { settlementToken: { equals: claimToken } },
          ],
        },
      } as never)
      if (!stillOwned) {
        logger.warn(
          `[stripe-webhook] claim stolen mid-settlement for ${paymentIntentID} — aborting at line ${i} (the re-claimer owns it now)`,
        )
        return
      }
      const item = items[i]
      const quantity = item.quantity
      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('[stripe-webhook] settlement aborted: invalid inventory item quantity')
      }
      const lineType = typeof item.lineType === 'string' && item.lineType ? item.lineType : 'standard'
      if (lineType !== 'standard') {
        // Composite lines (e.g. configured-build) carry no product/variant of
        // their own — stock targets come from the registered line type.
        const type = getLineItemType(lineType)
        if (type?.resolveStockUnits) {
          const units = await type.resolveStockUnits(item, payload)
          for (const unit of units) {
            const unitQty =
              typeof unit.quantity === 'number' && Number.isFinite(unit.quantity) && unit.quantity > 0
                ? unit.quantity
                : 1
            const target = unit.variant ?? unit.product
            if (target === null || target === undefined || target === '') {
              logger.warn(`[stripe-webhook] stock unit without target on '${lineType}' line — skipped`)
              continue
            }
            await decrement(unit.variant != null ? VARIANTS : PRODUCTS, target, unitQty * quantity)
          }
        } else {
          // No stock resolver and no own product/variant: payment is already
          // captured, so settle anyway and log loudly — a stuck transaction is
          // unrecoverable, a missed decrement is reconcilable.
          logger.warn(
            `[stripe-webhook] line type '${lineType}' has no resolveStockUnits and no product/variant — inventory not decremented`,
          )
        }
      } else {
        const hasVariant = item.variant !== null && item.variant !== undefined
        const targetId = hasVariant ? item.variant : item.product
        if (targetId === null || targetId === undefined || targetId === '') {
          throw new Error('[stripe-webhook] settlement aborted: inventory item without product/variant id')
        }
        await decrement(hasVariant ? VARIANTS : PRODUCTS, targetId, quantity)
      }
      await payload.db.updateOne({
        collection: TRANSACTIONS,
        data: { inventoryProgress: i + 1 },
        options: { atomic: true },
        req,
        where: {
          and: [
            { id: { equals: transaction.id } },
            { settlementToken: { equals: claimToken } },
          ],
        },
      } as never)
    }

    // Discount usage counts once (CAS marker) — run inside the try so a hiccup
    // is caught by the same retry-capable catch.
    await countDiscountUsage({
      payload,
      req,
      transactionId: transaction.id,
      cartId: transaction.cart,
      discountCodeApplied: transaction.discountCodeApplied,
    })

    // Settle + inventoryComplete in one conditional write: the token CAS means
    // a stolen claim never overwrites the thief's settle.
    const settled = await payload.db.updateOne({
      collection: TRANSACTIONS,
      data: {
        order: Number(order.id),
        status: 'succeeded',
        inventoryComplete: true,
        settlementToken: null,
      },
      options: { atomic: true },
      req,
      where: {
        and: [
          { id: { equals: transaction.id } },
          { settlementToken: { equals: claimToken } },
        ],
      },
    } as never)
    if (!settled) {
      logger.warn(
        `[stripe-webhook] claim stolen before final settle for ${paymentIntentID} — the re-claimer owns completion`,
      )
      return
    }
  } catch (err) {
    // 500 → Stripe retries; the stale-claim window (>60s) lets the retry
    // resume (orphan order reused, decrement loop continues at its marker).
    logger.error(
      `[stripe-webhook] settlement failed for ${paymentIntentID}: ${String(err)} — transaction stays 'processing', Stripe retry will resume it`,
    )
    throw err
  }

  // Reservation lifecycle (audit gap P2-C6): the settlement loop above
  // decremented every unit, so conversion is bookkeeping-only.
  await convertReservation(payload, req, paymentIntentID, { decrementComposite: false })
}

const failPaymentIntent = async ({ event, req }: WebhookArgs): Promise<void> => {
  const payload = req.payload
  const paymentIntentID = paymentIntentIdOf(event ?? {})
  if (!paymentIntentID) return
  // Release the stock hold first — a failed payment must stop counting
  // against availability even if the transaction CAS below loses. Best-effort:
  // a release hiccup must not 500 the webhook (Stripe would retry the event;
  // the hold expires on its own anyway).
  try {
    await releaseReservations(payload, req, paymentIntentID)
  } catch (err) {
    payload.logger.warn(`[stripe-webhook] hold release failed for ${paymentIntentID}: ${String(err)}`)
  }
  const transaction = await findTransactionByPaymentIntent(payload, req, paymentIntentID)
  if (!transaction || transaction.status !== 'pending') return // replay / settled: no-op
  await payload.db.updateOne({
    collection: TRANSACTIONS,
    data: { status: 'failed' },
    options: { atomic: true },
    req,
    where: {
      and: [
        { id: { equals: transaction.id } },
        { status: { equals: 'pending' } },
        { order: { exists: false } },
      ],
    },
  } as never)
}

const refundCharge = async ({ event, req }: WebhookArgs): Promise<void> => {
  const payload = req.payload
  const logger: Logger = payload.logger
  const charge = event?.data?.object
  if (!charge) return
  const paymentIntentID =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent && typeof charge.payment_intent === 'object'
        ? String(charge.payment_intent.id ?? '')
        : ''
  if (!paymentIntentID) return

  if (
    typeof charge.amount_refunded === 'number' &&
    typeof charge.amount === 'number' &&
    charge.amount_refunded < charge.amount
  ) {
    logger.info(`[stripe-webhook] partial refund on ${paymentIntentID} — order left for manual handling`)
    return
  }

  const transaction = await findTransactionByPaymentIntent(payload, req, paymentIntentID)
  if (!transaction || transaction.status === 'refunded') return
  const claimed = await payload.db.updateOne({
    collection: TRANSACTIONS,
    data: { status: 'refunded' },
    options: { atomic: true },
    req,
    where: {
      and: [
        { id: { equals: transaction.id } },
        { status: { equals: 'succeeded' } },
      ],
    },
  } as never)
  if (!claimed) {
    logger.warn(
      `[stripe-webhook] refund event for ${paymentIntentID} but transaction ${String(transaction.id)} is '${String(transaction.status)}' — not refunded`,
    )
    return
  }

  if (transaction.order) {
    const order = await payload.findByID({
      id: transaction.order,
      collection: ORDERS,
      depth: 0,
      req,
    })
    if (order && ['processing', 'completed'].includes(String((order as { status?: string }).status))) {
      await payload.update({
        id: order.id,
        collection: ORDERS,
        data: { status: 'refunded' },
        req,
      })
    }
  }
}

export const stripeWebhooks: Record<string, (args: WebhookArgs) => Promise<void>> = {
  'payment_intent.succeeded': settlePaymentIntent,
  'payment_intent.payment_failed': failPaymentIntent,
  // Expired/explicitly-cancelled PaymentIntents: same release path as failure
  // (audit gap P2-C6 — holds must not outlive the payment attempt).
  'payment_intent.canceled': failPaymentIntent,
  // charge.succeeded arrives as a separate event for the same payment — a
  // natural second delivery if the payment_intent handler wedged (entry 44).
  'charge.succeeded': settlePaymentIntent,
  'charge.refunded': refundCharge,
}

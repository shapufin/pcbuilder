import type { Payload, PayloadRequest } from 'payload'
import { randomUUID } from 'node:crypto'
import { getLineItemType } from '@buildmyrig/lib'
import { convertReservation, decrementStock } from './reservations.ts'

/**
 * Shared settlement core (Round D €0 checkout): the Stripe webhook and the
 * free-checkout confirm endpoint drive the same claim → order → decrement →
 * settle sequence. Extracted verbatim from `payments/stripe-webhooks.ts` so
 * both paths get the entry-44 hardening: CAS claim + fencing token, orphan
 * order reuse, resumable per-line decrement (incl. composite stock units),
 * once-only discount usage counting.
 *
 * `paymentKey` names the settlement key: a Stripe PaymentIntent id for the
 * webhook, `free:<transactionId>` for the €0 path. It keys reservation
 * conversion (a free order holds no reservations → conversion no-ops) and
 * log lines only.
 */

const ORDERS = 'orders'
const TRANSACTIONS = 'transactions'
const CARTS = 'carts'
const PRODUCTS = 'products'
const VARIANTS = 'variants'

/**
 * A6: count one use of the cart's applied discount code. At-most-once via a
 * CAS on the transaction's `discountCounted` marker (entry 32 review F2):
 * the upstream `confirmOrder` poll can settle a payment without ever counting
 * usage, and Stripe can deliver `payment_intent.succeeded` concurrently — the
 * marker makes every settlement path (webhook claim, poll-wins, repair, free
 * confirm) safe to call this. Never throws: usage counting must not abort a
 * settled payment.
 *
 * Entry 44 review (I3): the code counted is the one snapshotted on the
 * transaction at initiation (`discountCodeApplied`) — the cart can be edited
 * while the PaymentIntent is in flight, so reading `cart.discountCode` at
 * settle time could count a code that was never priced into the charge.
 */
export const countDiscountUsage = async ({
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
        `[settle] discount ${String(codeId)} at maxUses — marker set, usage not incremented (overshoot prevented)`,
      )
    }
  } catch (err) {
    payload.logger.warn(`[settle] discount usage count failed: ${String(err)}`)
  }
}

/**
 * A settled/paid transaction's idempotent post-steps: discount usage (CAS
 * marker) + reservation conversion. `decrementComposite` is driven by the
 * transaction's `inventoryComplete` marker: the settlement loop sets it
 * (composite units already decremented → bookkeeping-only); the upstream
 * confirmOrder poll never sets it (it skips composite lines → the conversion
 * must decrement them).
 */
export const postSettleSteps = async (
  payload: Payload,
  req: PayloadRequest,
  paymentKey: string,
  transaction: Record<string, any>,
): Promise<void> => {
  await countDiscountUsage({
    payload,
    req,
    transactionId: transaction.id,
    cartId: transaction.cart,
    discountCodeApplied: transaction.discountCodeApplied,
  })
  await convertReservation(payload, req, paymentKey, {
    decrementComposite: transaction.inventoryComplete !== true,
  })
}

/**
 * Claim a transaction for settlement: `pending`, or `processing` only when
 * stale (>60s — the previous attempt died). The atomic where-update is a
 * single-statement conditional write on drizzle (options.atomic + join-free
 * predicates), so two concurrent settlements can't both win. The claim also
 * writes a fencing token: a re-claim steals the token, and the displaced
 * worker's per-line CAS then fails instead of double-decrementing (#286).
 * Returns the fencing token on win, null on loss.
 */
export const claimSettlement = async (
  payload: Payload,
  req: PayloadRequest,
  transactionId: unknown,
): Promise<string | null> => {
  const staleBefore = new Date(Date.now() - 60_000).toISOString()
  const claimToken = randomUUID()
  const claimed = await payload.db.updateOne({
    collection: TRANSACTIONS,
    data: { status: 'processing', settlementToken: claimToken },
    options: { atomic: true },
    req,
    where: {
      and: [
        { id: { equals: transactionId } },
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
  return claimed ? claimToken : null
}

/**
 * Claimed-transaction settlement (mirrors plugin-ecommerce's private
 * `finalizeTransactionOrder`): orphan-order reuse → create order → mark cart
 * purchased → resumable inventory decrement → discount usage → CAS settle →
 * reservation conversion. Returns the order id on success, null when the
 * claim was stolen mid-flight (the thief owns completion). Throws on real
 * failures — callers surface a retryable error and the stale-claim window
 * lets the retry resume.
 */
export const settleClaimedTransaction = async ({
  payload,
  req,
  transaction,
  claimToken,
  amount,
  currency,
  items,
  shippingAddress,
  paymentKey,
}: {
  payload: Payload
  req: PayloadRequest
  transaction: Record<string, any>
  claimToken: string
  amount: number
  currency: string
  items: Record<string, unknown>[]
  shippingAddress?: Record<string, unknown>
  paymentKey: string
}): Promise<{ orderId: string | number } | null> => {
  const logger = payload.logger
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
    logger.warn(`[settle] reusing orphan order ${String(order.id)} for ${paymentKey}`)
  } else {
    order = await payload.create({
      collection: ORDERS,
      data: {
        amount,
        // Store prices/orders are EUR-only; the orders currency select carries
        // that literal type, so narrow the passthrough value.
        currency: String(currency ?? 'EUR').toUpperCase() as 'EUR',
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
        `[settle] claim stolen mid-settlement for ${paymentKey} — aborting at line ${i} (the re-claimer owns it now)`,
      )
      return null
    }
    const item = items[i]
    const quantity = item.quantity
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('[settle] settlement aborted: invalid inventory item quantity')
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
            logger.warn(`[settle] stock unit without target on '${lineType}' line — skipped`)
            continue
          }
          await decrement(unit.variant != null ? VARIANTS : PRODUCTS, target, unitQty * quantity)
        }
      } else {
        // No stock resolver and no own product/variant: payment is already
        // captured, so settle anyway and log loudly — a stuck transaction is
        // unrecoverable, a missed decrement is reconcilable.
        logger.warn(
          `[settle] line type '${lineType}' has no resolveStockUnits and no product/variant — inventory not decremented`,
        )
      }
    } else {
      const hasVariant = item.variant !== null && item.variant !== undefined
      const targetId = hasVariant ? item.variant : item.product
      if (targetId === null || targetId === undefined || targetId === '') {
        throw new Error('[settle] settlement aborted: inventory item without product/variant id')
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

  // Discount usage counts once (CAS marker) — a hiccup here must not wedge
  // settlement (countDiscountUsage never throws).
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
      `[settle] claim stolen before final settle for ${paymentKey} — the re-claimer owns completion`,
    )
    return null
  }

  // Reservation lifecycle (audit gap P2-C6): the loop above decremented every
  // unit, so conversion is bookkeeping-only. Free orders hold no reservation
  // under their `free:<id>` key — the lookup no-ops.
  await convertReservation(payload, req, paymentKey, { decrementComposite: false })
  return { orderId: order.id }
}

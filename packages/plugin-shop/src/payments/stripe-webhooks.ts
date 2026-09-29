import type { Payload, PayloadRequest } from 'payload'

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

const asId = (value: unknown): string => {
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: unknown }).id)
  }
  return String(value)
}

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
  return object.id
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
  if (transaction.status === 'succeeded') return // replay: already settled
  if (transaction.order) {
    // Order exists but status lagged (crash between create and settle): repair.
    await payload.update({
      id: transaction.id,
      collection: TRANSACTIONS,
      data: { status: 'succeeded' },
      req,
    })
    return
  }

  const claimed = await payload.db.updateOne({
    collection: TRANSACTIONS,
    data: { status: 'processing' },
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
  if (!claimed) {
    logger.warn(
      `[stripe-webhook] transaction ${String(transaction.id)} not claimable (state '${String(transaction.status)}') for ${paymentIntentID} — settlement deferred; check for an interrupted settlement`,
    )
    return
  }

  const object = event?.data?.object ?? {}
  const metadata = (object.metadata ?? {}) as Record<string, unknown>
  const snapshotItems = parseJson<Record<string, unknown>[]>(metadata.cartItemsSnapshot)
  const items = Array.isArray(snapshotItems) && snapshotItems.length > 0
    ? snapshotItems
    : (transaction.items as Record<string, unknown>[])
  const shippingAddress = parseJson<Record<string, unknown>>(metadata.shippingAddress) ?? undefined

  const order = await payload.create({
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
    },
    req,
  })

  if (transaction.cart) {
    await payload.update({
      id: transaction.cart,
      collection: CARTS,
      data: { purchasedAt: new Date().toISOString() },
      req,
    })
  }

  for (const item of items as Array<Record<string, unknown>>) {
    const quantity = item.quantity
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('[stripe-webhook] settlement aborted: invalid inventory item quantity')
    }
    const hasVariant = item.variant !== null && item.variant !== undefined
    const targetId = hasVariant ? item.variant : item.product
    if (targetId === null || targetId === undefined || targetId === '') {
      throw new Error('[stripe-webhook] settlement aborted: inventory item without product/variant id')
    }
    const updated = await payload.db.updateOne({
      id: asId(targetId),
      collection: hasVariant ? VARIANTS : PRODUCTS,
      data: { inventory: { $inc: quantity * -1 } },
      req,
    } as never)
    if (!updated) {
      throw new Error(`[stripe-webhook] settlement aborted: inventory target ${String(targetId)} not updated`)
    }
  }

  await payload.update({
    id: transaction.id,
    collection: TRANSACTIONS,
    data: { order: order.id, status: 'succeeded' },
    req,
  })
}

const failPaymentIntent = async ({ event, req }: WebhookArgs): Promise<void> => {
  const payload = req.payload
  const paymentIntentID = paymentIntentIdOf(event ?? {})
  if (!paymentIntentID) return
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
  'charge.refunded': refundCharge,
}

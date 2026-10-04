import type { Payload, PayloadRequest } from 'payload'
import { releaseReservations } from '../lib/reservations.ts'
import {
  claimSettlement,
  postSettleSteps,
  settleClaimedTransaction,
} from '../lib/settle-transaction.ts'

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
 * Mirrors plugin-ecommerce's private `finalizeTransactionOrder` (not exported):
 * claim → create order → mark cart purchased → decrement inventory → settle.
 * The claim + settle core lives in `lib/settle-transaction.ts`, shared with
 * the €0 confirm-free endpoint (Round D).
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
  // settlement attempt died). See claimSettlement for the CAS + fencing token.
  const claimToken = await claimSettlement(payload, req, transaction.id)
  if (!claimToken) {
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
    await settleClaimedTransaction({
      payload,
      req,
      transaction,
      claimToken,
      amount: typeof object.amount === 'number' ? object.amount : transaction.amount,
      // Store prices/orders are EUR-only; the orders currency select carries
      // that literal type, so narrow Stripe's passthrough value.
      currency: String(object.currency ?? transaction.currency ?? 'EUR').toUpperCase() as 'EUR',
      items,
      shippingAddress,
      paymentKey: paymentIntentID,
    })
  } catch (err) {
    // 500 → Stripe retries; the stale-claim window (>60s) lets the retry
    // resume (orphan order reused, decrement loop continues at its marker).
    logger.error(
      `[stripe-webhook] settlement failed for ${paymentIntentID}: ${String(err)} — transaction stays 'processing', Stripe retry will resume it`,
    )
    throw err
  }
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

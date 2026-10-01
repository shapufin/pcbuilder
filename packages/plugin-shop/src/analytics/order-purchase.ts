/**
 * Server-side `purchase` event (12-integrations-ops.md plan spec: "purchase
 * (order-paid webhook)"). Fires on order creation — the create is exactly
 * the settlement moment (Stripe webhook / confirm poll CAS winner), so a
 * manual admin order counts as real revenue too. cancelled/refunded are
 * never revenue. The client-side track('Purchase') at checkout confirm is a
 * different event name with browser attribution context — both may fire for
 * one order without double-counting inside a goal.
 *
 * NEVER throws: analytics failures must not break order writes / settlement.
 */

import type { EmailLogger } from '../emails/resend.ts'
import { sendPlausibleEvent } from './plausible.ts'

type OrderPurchaseDoc = {
  id?: number | string
  amount?: number | null
  status?: string | null
}

export type OrderPurchaseAfterChangeArgs = {
  doc: OrderPurchaseDoc
  operation?: 'create' | 'update' | 'delete' | string
  req?: { payload: { logger: EmailLogger } }
}

export const orderPurchaseAfterChange = async ({
  doc,
  operation,
  req,
}: OrderPurchaseAfterChangeArgs): Promise<void> => {
  const logger = req?.payload?.logger
  if (!logger) return
  if (operation !== 'create') return
  if (doc.status === 'cancelled' || doc.status === 'refunded') return

  try {
    const base = (process.env.BMR_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
    const amount =
      typeof doc.amount === 'number' && Number.isFinite(doc.amount) ? doc.amount / 100 : 0
    await sendPlausibleEvent(
      {
        name: 'purchase',
        url: `${base}/checkout`,
        props: { order_id: String(doc.id ?? '') },
        revenue: { currency: 'EUR', amount },
      },
      logger,
    )
  } catch (error) {
    logger.error(`[plausible] order #${String(doc.id)} purchase event failed: ${String(error)}`)
  }
}

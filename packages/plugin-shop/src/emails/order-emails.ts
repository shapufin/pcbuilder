import type { EmailLogger } from './resend.ts'
import { sendResendEmail } from './resend.ts'
import {
  formatEur,
  orderConfirmationHtml,
  orderShippedHtml,
  type OrderEmailLine,
} from './templates.ts'

/**
 * Order lifecycle emails (04-collections/commerce.md hooks):
 * - create  → confirmation. Orders are created exactly once — whichever side
 *   claims the transaction CAS first: Stripe webhook settlement
 *   (payments/stripe-webhooks.ts) or plugin-ecommerce's confirm poll
 *   (endpoints/confirmOrder). One CAS winner → one email per order.
 * - update processing → completed → shipping notice (fulfilment status —
 *   staff may flip processing|completed (status-only, collections/orders.ts),
 *   manager+ may set any status; docs/admin-training.md).
 *
 * Real status enum is plugin-ecommerce's OrderStatus
 * ('processing' | 'completed' | 'cancelled' | 'refunded').
 *
 * NEVER throws: a failed/down Resend call is logged only — payment
 * settlement and fulfilment status updates must not break because of email.
 */

type OrderItemLike = {
  quantity?: number | null
  buildName?: string | null
  lineLabel?: string | null
  product?: number | string | { title?: string | null } | null
  variant?: number | string | { title?: string | null; product?: unknown } | null
}

type OrderDocLike = {
  id?: number | string
  status?: string | null
  customerEmail?: string | null
  customer?: number | string | { email?: string | null } | null
  amount?: number | null
  items?: OrderItemLike[] | null
  shippingAddress?: Record<string, string | null> | null
}

type PayloadLike = {
  logger: EmailLogger
  findByID?: (args: {
    collection: string
    id: number | string
    depth?: number
    req?: unknown
  }) => Promise<Record<string, unknown> | null>
}

export type OrderEmailsAfterChangeArgs = {
  doc: OrderDocLike
  operation?: 'create' | 'update' | 'delete' | string
  previousDoc?: OrderDocLike | null
  req?: { payload: PayloadLike }
}

const resolveRecipient = async (
  doc: OrderDocLike,
  payload: PayloadLike,
  req: unknown,
): Promise<string | null> => {
  const guest = typeof doc.customerEmail === 'string' ? doc.customerEmail.trim() : ''
  if (guest.includes('@')) return guest
  const customer = doc.customer
  if (customer && typeof customer === 'object' && typeof customer.email === 'string') {
    return customer.email
  }
  if (typeof customer === 'number' || typeof customer === 'string') {
    try {
      const user = await payload.findByID?.({ collection: 'users', id: customer, req })
      if (user && typeof user.email === 'string' && user.email) return user.email
    } catch {
      // fall through — no recipient
    }
  }
  return null
}

const lineName = (item: OrderItemLike, index: number): string => {
  if (item.buildName) return item.buildName
  if (item.lineLabel) return item.lineLabel
  const variant = typeof item.variant === 'object' && item.variant ? item.variant : null
  const product =
    typeof item.product === 'object' && item.product
      ? item.product
      : typeof variant?.product === 'object' && variant?.product
        ? (variant.product as { title?: string | null })
        : null
  const title = product?.title ?? null
  if (variant?.title) return title ? `${title} (${variant.title})` : variant.title
  if (title) return title
  if (typeof item.variant === 'number' || typeof item.variant === 'string') {
    return `Variant #${item.variant}`
  }
  if (typeof item.product === 'number' || typeof item.product === 'string') {
    return `Product #${item.product}`
  }
  return `Item ${index + 1}`
}

/** Re-reads the order at depth 1 so product/variant titles populate; falls back to raw items. */
const loadLines = async (
  doc: OrderDocLike,
  payload: PayloadLike,
  req: unknown,
): Promise<OrderEmailLine[]> => {
  let items = doc.items ?? []
  try {
    if (doc.id !== undefined && items.length > 0 && payload.findByID) {
      const full = await payload.findByID({ collection: 'orders', id: doc.id, depth: 1, req })
      if (Array.isArray(full?.items)) items = full.items as OrderItemLike[]
    }
  } catch {
    // keep raw items
  }
  return items.map((item, index) => ({
    name: lineName(item, index),
    quantity: typeof item.quantity === 'number' ? item.quantity : 1,
  }))
}

const addressLine = (doc: OrderDocLike): string | null => {
  const a = doc.shippingAddress
  if (!a) return null
  const parts = [
    [a.firstName, a.lastName].filter(Boolean).join(' ') || null,
    a.company,
    a.addressLine1,
    a.addressLine2,
    [a.postalCode, a.city].filter(Boolean).join(' '),
    a.country,
  ].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(', ') : null
}

export const orderEmailsAfterChange = async ({
  doc,
  operation,
  previousDoc,
  req,
}: OrderEmailsAfterChangeArgs): Promise<void> => {
  const payload = req?.payload
  if (!payload?.logger) return
  const logger = payload.logger

  const isConfirmation = operation === 'create'
  const isShipment =
    operation === 'update' && previousDoc?.status === 'processing' && doc.status === 'completed'
  if (!isConfirmation && !isShipment) return

  try {
    const to = await resolveRecipient(doc, payload, req)
    if (!to) {
      logger.warn(`[email] order #${String(doc.id)}: no email address on order — skipped`)
      return
    }

    const orderId = String(doc.id ?? '?')
    const html = isConfirmation
      ? orderConfirmationHtml({
          orderId,
          total: formatEur(doc.amount),
          lines: await loadLines(doc, payload, req),
          email: to,
          address: addressLine(doc),
        })
      : orderShippedHtml({
          orderId,
          total: formatEur(doc.amount),
          lines: await loadLines(doc, payload, req),
          email: to,
          address: addressLine(doc),
        })
    const subject = isConfirmation
      ? `Your BuildMyRig order #${orderId} is confirmed`
      : `Your BuildMyRig order #${orderId} has shipped`

    await sendResendEmail({ to, subject, html }, logger)
  } catch (error) {
    // Email failures never break the order write (settlement / staff update).
    logger.error(`[email] order #${String(doc.id)} email failed: ${String(error)}`)
  }
}

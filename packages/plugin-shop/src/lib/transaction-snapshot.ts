import type { PayloadRequest } from 'payload'

type TxData = { cart?: unknown; [key: string]: unknown }

const relId = (v: unknown): string | number | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'object' && 'id' in v) return (v as { id: string | number }).id
  return v as string | number
}

/**
 * beforeChange(create) on `transactions` (entry 44 review I3/I4): snapshot the
 * applied discount code and the computed cart totals **at charge time**. The
 * cart stays editable while the PaymentIntent is in flight, so settle-time
 * reads of the cart can misattribute usage/totals — settlement reads these
 * snapshot fields instead (webhook falls back to the cart for rows created
 * before the fields existed). Never throws: a missing cart must not break
 * payment initiation.
 */
export const snapshotCartCheckoutState = async ({
  data,
  req,
  operation,
}: {
  data?: TxData
  req: PayloadRequest
  operation?: string
}): Promise<TxData | undefined> => {
  if (!data || operation === 'update') return data
  const cartId = relId(data.cart)
  if (cartId === null) return data
  try {
    const cart = (await req.payload.findByID({
      collection: 'carts' as never,
      id: cartId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as {
      discountCode?: unknown
      subtotal?: number
      discountTotal?: number
      shippingTotal?: number
      taxTotal?: number
      total?: number
    } | null
    if (!cart) return data
    const codeId = relId(cart.discountCode)
    if (codeId !== null) data.discountCodeApplied = codeId
    data.totalsSnapshot = {
      subtotal: typeof cart.subtotal === 'number' ? cart.subtotal : 0,
      discountTotal: typeof cart.discountTotal === 'number' ? cart.discountTotal : 0,
      shippingTotal: typeof cart.shippingTotal === 'number' ? cart.shippingTotal : 0,
      taxTotal: typeof cart.taxTotal === 'number' ? cart.taxTotal : 0,
      total: typeof cart.total === 'number' ? cart.total : 0,
    }
  } catch {
    // Snapshot is best-effort bookkeeping — never break transaction create.
  }
  return data
}

import { describe, it, expect, vi } from 'vitest'
import { snapshotCartCheckoutState } from './transaction-snapshot.ts'

/**
 * Entry 44 review (I3/I4): the transaction snapshots the applied discount +
 * totals at charge time; settlement must not trust a cart the shopper could
 * have edited while the PaymentIntent was in flight.
 */
const makeReq = (cart: unknown) => ({
  payload: {
    findByID: vi.fn(async () => cart),
  },
}) as never

describe('snapshotCartCheckoutState (transactions beforeChange)', () => {
  it('#283 create snapshots discountCode + totals from the cart', async () => {
    const data: Record<string, unknown> = { cart: 3, status: 'pending' }
    const cart = {
      id: 3,
      discountCode: { id: 55 },
      subtotal: 10000,
      discountTotal: 1000,
      shippingTotal: 499,
      taxTotal: 1602,
      total: 9499,
    }
    await snapshotCartCheckoutState({ data, req: makeReq(cart), operation: 'create' })
    expect(data.discountCodeApplied).toBe(55)
    expect(data.totalsSnapshot).toEqual({
      subtotal: 10000,
      discountTotal: 1000,
      shippingTotal: 499,
      taxTotal: 1602,
      total: 9499,
    })
  })

  it('#284 update ops and missing carts leave data untouched', async () => {
    const data: Record<string, unknown> = { cart: 3 }
    await snapshotCartCheckoutState({ data, req: makeReq(null), operation: 'update' })
    expect(data.totalsSnapshot).toBeUndefined()
    // create with a gone cart — best-effort, never throws
    await snapshotCartCheckoutState({ data, req: makeReq(null), operation: 'create' })
    expect(data.totalsSnapshot).toBeUndefined()
    // no cart at all
    await snapshotCartCheckoutState({ data: {}, req: makeReq(null), operation: 'create' })
    expect(data.discountCodeApplied).toBeUndefined()
  })
})

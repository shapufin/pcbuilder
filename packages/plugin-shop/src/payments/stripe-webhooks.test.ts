import { describe, it, expect, vi } from 'vitest'
import { stripeWebhooks } from './stripe-webhooks.ts'

type Row = Record<string, any>

const matchWhere = (row: Row, where: any): boolean => {
  if (!where) return true
  if (Array.isArray(where.and)) return where.and.every((w: any) => matchWhere(row, w))
  for (const [key, cond] of Object.entries<any>(where)) {
    const value = key.includes('.')
      ? key.split('.').reduce((o: any, k) => (o == null ? o : o[k]), row)
      : row[key]
    if ('equals' in cond) {
      if (String(value ?? '') !== String(cond.equals)) return false
    } else if ('exists' in cond) {
      const exists = value !== undefined && value !== null
      if (exists !== cond.exists) return false
    } else if ('in' in cond) {
      if (!cond.in.includes(value)) return false
    } else {
      return false
    }
  }
  return true
}

const makePayload = (initial: { transactions?: Row[]; orders?: Row[]; carts?: Row[]; products?: Row[] } = {}) => {
  const store: Record<string, Row[]> = {
    transactions: initial.transactions ?? [],
    orders: initial.orders ?? [],
    carts: initial.carts ?? [],
    products: initial.products ?? [],
    variants: [],
  }
  let nextId = 100
  const applyData = (row: Row, data: Row): void => {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && '$inc' in (value as Row)) {
        row[key] = (row[key] ?? 0) + (value as { $inc: number }).$inc
      } else {
        row[key] = value
      }
    }
  }
  const payload = {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    find: vi.fn(async ({ collection, where, limit }: any) => {
      const docs = store[collection].filter((r) => matchWhere(r, where)).slice(0, limit ?? 10)
      return { docs, totalDocs: docs.length }
    }),
    findByID: vi.fn(async ({ id, collection }: any) =>
      store[collection].find((r) => String(r.id) === String(id)) ?? null,
    ),
    create: vi.fn(async ({ collection, data }: any) => {
      const row = { id: nextId++, ...data }
      store[collection].push(row)
      return row
    }),
    update: vi.fn(async ({ id, collection, data }: any) => {
      const row = store[collection].find((r) => String(r.id) === String(id))
      if (!row) return null
      applyData(row, data)
      return row
    }),
    db: {
      updateOne: vi.fn(async ({ collection, data, where }: any) => {
        const row = store[collection].find((r) => matchWhere(r, where))
        if (!row) return null
        applyData(row, data)
        return row
      }),
    },
  }
  return { payload, store }
}

const pendingTxn = (over: Row = {}): Row => ({
  id: 7,
  status: 'pending',
  cart: 3,
  amount: 129900,
  currency: 'EUR',
  customerEmail: 'buyer@example.com',
  items: [{ product: 31, quantity: 1 }],
  stripe: { paymentIntentID: 'pi_test_1' },
  ...over,
})

const succeededEvent = (over: Row = {}): any => ({
  id: 'evt_1',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_test_1',
      amount: 129900,
      currency: 'eur',
      metadata: {
        cartItemsSnapshot: JSON.stringify([{ product: 31, quantity: 1 }]),
        shippingAddress: JSON.stringify({ line1: 'Test Street 1' }),
      },
      ...over,
    },
  },
})

const asReq = (payload: any): any => ({ payload })

describe('stripe webhook handlers — Phase 4 webhook idempotency', () => {
  it('#53 payment_intent.succeeded settles pending transaction end-to-end', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    await stripeWebhooks['payment_intent.succeeded']({
      event: succeededEvent(),
      req: asReq(payload),
    })
    expect(store.orders).toHaveLength(1)
    expect(store.orders[0]).toMatchObject({ status: 'processing', amount: 129900 })
    expect(store.orders[0].transactions).toEqual([7])
    expect(store.carts[0].purchasedAt).toBeTruthy()
    expect(store.products[0].inventory).toBe(4)
    expect(store.transactions[0]).toMatchObject({ status: 'succeeded', order: 100 })
  })

  it('#54 replayed succeeded event is a no-op (idempotent by state guard)', async () => {
    const { payload, store } = makePayload({
      transactions: [
        pendingTxn({ status: 'succeeded', order: 55, cart: null }),
      ],
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    await stripeWebhooks['payment_intent.succeeded']({
      event: succeededEvent(),
      req: asReq(payload),
    })
    expect(store.orders).toHaveLength(1)
    expect(store.products[0].inventory).toBe(5)
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('#55 lost claim race (processing, no order) warns and creates nothing', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn({ status: 'processing' })],
      products: [{ id: 31, inventory: 5 }],
    })
    await stripeWebhooks['payment_intent.succeeded']({
      event: succeededEvent(),
      req: asReq(payload),
    })
    expect(store.orders).toHaveLength(0)
    expect(payload.logger.warn).toHaveBeenCalled()
    expect(store.products[0].inventory).toBe(5)
  })

  it('#56 unknown payment intent is ignored without writes', async () => {
    const { payload, store } = makePayload()
    await stripeWebhooks['payment_intent.succeeded']({
      event: succeededEvent(),
      req: asReq(payload),
    })
    expect(store.orders).toHaveLength(0)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.logger.info).toHaveBeenCalled()
  })

  it('#57 payment_failed marks only a pending transaction failed; replays no-op', async () => {
    const { payload, store } = makePayload({ transactions: [pendingTxn()] })
    await stripeWebhooks['payment_intent.payment_failed']({
      event: { id: 'evt_2', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_test_1' } } },
      req: asReq(payload),
    })
    expect(store.transactions[0].status).toBe('failed')
    // replay: state guard makes the second delivery a no-op
    await stripeWebhooks['payment_intent.payment_failed']({
      event: { id: 'evt_3', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_test_1' } } },
      req: asReq(payload),
    })
    expect(store.transactions[0].status).toBe('failed')
    expect(store.orders).toHaveLength(0)
    // a settled transaction is never downgraded by a late failure event
    const settled = makePayload({ transactions: [pendingTxn({ status: 'succeeded', order: 55 })] })
    await stripeWebhooks['payment_intent.payment_failed']({
      event: { id: 'evt_4', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_test_1' } } },
      req: asReq(settled.payload),
    })
    expect(settled.store.transactions[0].status).toBe('succeeded')
  })

  it('#58 charge.refunded: full refund settles transaction+order once; partial untouched', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn({ status: 'succeeded', order: 55, cart: null })],
      orders: [{ id: 55, status: 'completed', transactions: [7] }],
    })
    const fullRefund = {
      id: 'evt_5',
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_test_1', amount: 129900, amount_refunded: 129900 } },
    }
    await stripeWebhooks['charge.refunded']({ event: fullRefund, req: asReq(payload) })
    expect(store.transactions[0].status).toBe('refunded')
    expect(store.orders[0].status).toBe('refunded')
    // replay
    await stripeWebhooks['charge.refunded']({ event: fullRefund, req: asReq(payload) })
    expect(store.transactions[0].status).toBe('refunded')
    expect(store.orders[0].status).toBe('refunded')

    const partial = makePayload({
      transactions: [pendingTxn({ status: 'succeeded', order: 56, cart: null })],
      orders: [{ id: 56, status: 'completed', transactions: [7] }],
    })
    await stripeWebhooks['charge.refunded']({
      event: { id: 'evt_6', type: 'charge.refunded', data: { object: { payment_intent: 'pi_test_1', amount: 129900, amount_refunded: 5000 } } },
      req: asReq(partial.payload),
    })
    expect(partial.store.transactions[0].status).toBe('succeeded')
    expect(partial.store.orders[0].status).toBe('completed')
  })
})

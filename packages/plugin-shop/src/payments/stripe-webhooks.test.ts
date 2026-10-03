import { describe, it, expect, vi } from 'vitest'
import { registerLineItemType } from '@buildmyrig/lib'
import { stripeWebhooks } from './stripe-webhooks.ts'

type Row = Record<string, any>

const matchWhere = (row: Row, where: any): boolean => {
  if (!where) return true
  if (Array.isArray(where.and)) return where.and.every((w: any) => matchWhere(row, w))
  if (Array.isArray(where.or)) return where.or.some((w: any) => matchWhere(row, w))
  for (const [key, cond] of Object.entries<any>(where)) {
    const value = key.includes('.')
      ? key.split('.').reduce((o: any, k) => (o == null ? o : o[k]), row)
      : row[key]
    if ('equals' in cond) {
      if (String(value ?? '') !== String(cond.equals)) return false
    } else if ('not_equals' in cond) {
      if (String(value ?? '') === String(cond.not_equals)) return false
    } else if ('exists' in cond) {
      const exists = value !== undefined && value !== null
      if (exists !== cond.exists) return false
    } else if ('in' in cond) {
      if (!cond.in.includes(value)) return false
    } else if ('less_than' in cond) {
      if (value === undefined || value === null) return false
      if (!(String(value) < String(cond.less_than))) return false
    } else if ('greater_than' in cond) {
      if (value === undefined || value === null) return false
      if (!(String(value) > String(cond.greater_than))) return false
    } else if ('contains' in cond) {
      const has = Array.isArray(value)
        ? value.some((v: any) => String(v) === String(cond.contains))
        : String(value ?? '') === String(cond.contains)
      if (!has) return false
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
    'discount-codes': [],
    'inventory-reservations': [],
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
    update: vi.fn(async ({ id, collection, data, where }: any) => {
      const found = store[collection].find((r) => String(r.id) === String(id))
      const rows = where ? store[collection].filter((r) => matchWhere(r, where)) : found ? [found] : []
      if (rows.length === 0) return null
      for (const row of rows) applyData(row, data)
      return rows[0]
    }),
    db: {
      updateOne: vi.fn(async ({ collection, data, where, id }: any) => {
        const row = store[collection].find((r) =>
          where ? matchWhere(r, where) : String(r.id) === String(id),
        )
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

  it('#198 settlement increments the applied discount code once (A6)', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
      carts: [{ id: 3, discountCode: 55 }],
      products: [{ id: 31, inventory: 5 }],
    })
    store['discount-codes'].push({ id: 55, code: 'SAVE10', usedCount: 0 })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(1)
    // Replay: the state guard returns before any second increment.
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(1)
  })

  it('#199 settlement without a discount code leaves usedCount alone', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    store['discount-codes'].push({ id: 55, code: 'SAVE10', usedCount: 4 })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(4)
  })

  it('#213 settlement converts the reservation without re-decrementing (webhook won)', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    store['inventory-reservations'].push({
      id: 9,
      paymentIntentID: 'pi_test_1',
      status: 'held',
      items: [{ lineType: 'standard', product: 31, quantity: 1 }],
    })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    // Settlement loop decremented once; conversion must not decrement again.
    expect(store.products[0].inventory).toBe(4)
    expect(store['inventory-reservations'][0].status).toBe('converted')
  })

  it('#214 poll-wins (transaction already succeeded): reservation converts with composite-only decrement', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn({ status: 'succeeded', order: 55 })],
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    store.variants.push({ id: 77, inventory: 5 })
    store['inventory-reservations'].push({
      id: 9,
      paymentIntentID: 'pi_test_1',
      status: 'held',
      items: [
        { lineType: 'standard', product: 31, quantity: 1 },
        { lineType: 'configured-build', variant: 77, quantity: 2 },
      ],
    })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    // Standard was decremented by the poll; composite is decremented here.
    expect(store.products[0].inventory).toBe(5)
    expect(store.variants[0].inventory).toBe(3)
    expect(store['inventory-reservations'][0].status).toBe('converted')
  })

  it('#215 payment_failed releases the hold', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
    })
    store['inventory-reservations'].push({ id: 9, paymentIntentID: 'pi_test_1', status: 'held', items: [] })
    await stripeWebhooks['payment_intent.payment_failed']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['inventory-reservations'][0].status).toBe('released')
    expect(store.transactions[0].status).toBe('failed')
  })

  it('#216 payment_intent.canceled releases the hold and fails the pending transaction', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
    })
    store['inventory-reservations'].push({ id: 9, paymentIntentID: 'pi_test_1', status: 'held', items: [] })
    await stripeWebhooks['payment_intent.canceled']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['inventory-reservations'][0].status).toBe('released')
    expect(store.transactions[0].status).toBe('failed')
  })

  it('#217 settlement decrement warns loudly on insufficient stock (oversell ledger)', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 2 }],
    })
    const event = succeededEvent()
    event.data.object.metadata.cartItemsSnapshot = JSON.stringify([{ product: 31, quantity: 5 }])
    await stripeWebhooks['payment_intent.succeeded']({ event, req: asReq(payload) })
    expect(store.products[0].inventory).toBe(-3) // accurate oversell ledger
    expect(payload.logger.error).toHaveBeenCalled()
  })

  it('#230 poll-wins complete (transaction already succeeded) still counts discount usage once', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn({ status: 'succeeded', order: 55 })],
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
      carts: [{ id: 3, discountCode: 55 }],
    })
    store['discount-codes'].push({ id: 55, code: 'SAVE10', usedCount: 0 })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    // The upstream poll settles without counting usage; the webhook must.
    expect(store['discount-codes'][0].usedCount).toBe(1)
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(1)
  })

  it('#232 a failing hold release never breaks payment_failed (webhook stays 2xx)', async () => {
    const { payload, store } = makePayload({ transactions: [pendingTxn()] })
    store['inventory-reservations'].push({ id: 9, paymentIntentID: 'pi_test_1', status: 'held', items: [] })
    payload.update.mockRejectedValueOnce(new Error('db down'))
    await expect(
      stripeWebhooks['payment_intent.payment_failed']({ event: succeededEvent(), req: asReq(payload) }),
    ).resolves.toBeUndefined()
    expect(store.transactions[0].status).toBe('failed')
    expect(payload.logger.warn).toHaveBeenCalled()
  })

  it('#240 legacy transaction (marker column NULL) still counts its discount once', async () => {
    const { payload, store } = makePayload({
      // No `discountCounted` key at all — the pre-marker row shape.
      transactions: [pendingTxn({ status: 'succeeded', order: 55 })],
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
      carts: [{ id: 3, discountCode: 55 }],
    })
    store['discount-codes'].push({ id: 55, code: 'SAVE10', usedCount: 0 })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(1)
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
      transactions: [pendingTxn({ status: 'processing', updatedAt: new Date().toISOString() })],
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

  it('#276 stale processing (>60s) is re-claimed — a dead settlement resumes', async () => {
    const { payload, store } = makePayload({
      transactions: [
        pendingTxn({ status: 'processing', updatedAt: '2020-01-01T00:00:00.000Z' }),
      ],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store.orders).toHaveLength(1)
    expect(store.transactions[0]).toMatchObject({ status: 'succeeded', inventoryComplete: true })
    expect(store.products[0].inventory).toBe(4)
  })

  it('#277 lost claim that lands mid-wait still runs post-steps (discount + conversion)', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn({ status: 'processing', updatedAt: new Date().toISOString() })],
      carts: [{ id: 3, discountCode: 55 }],
      products: [{ id: 31, inventory: 5 }],
    })
    store['discount-codes'].push({ id: 55, code: 'SAVE10', usedCount: 0 })
    store['inventory-reservations'].push({
      id: 9, paymentIntentID: 'pi_test_1', status: 'held',
      items: [{ lineType: 'configured-build', product: 31, quantity: 2 }],
    })
    // The claim fails while the competitor lands succeeded in the same instant.
    payload.db.updateOne.mockImplementationOnce(async () => {
      store.transactions[0].status = 'succeeded'
      store.transactions[0].order = 99
      return null
    })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(1)
    // inventoryComplete unset (poll-wins semantics) → composite decrement runs here.
    expect(store['inventory-reservations'][0].status).toBe('converted')
    expect(store.products[0].inventory).toBe(3)
    expect(store.orders).toHaveLength(0)
  })

  it('#278 crash between order create and link: the orphan order is reused, not duplicated', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
      // Orphan: order exists and points at tx 7, but tx.order was never set.
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(payload.create).not.toHaveBeenCalled()
    expect(store.orders).toHaveLength(1)
    expect(store.transactions[0]).toMatchObject({ status: 'succeeded', order: 55 })
    expect(store.products[0].inventory).toBe(4)
  })

  it('#279 mid-loop crash resumes at inventoryProgress (no double decrement)', async () => {
    const { payload, store } = makePayload({
      transactions: [
        pendingTxn({
          status: 'processing',
          updatedAt: '2020-01-01T00:00:00.000Z',
          inventoryProgress: 1,
          items: [{ product: 31, quantity: 2 }, { product: 32, quantity: 1 }],
        }),
      ],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 10 }, { id: 32, inventory: 10 }],
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
    })
    const event = succeededEvent()
    event.data.object.metadata.cartItemsSnapshot = JSON.stringify([
      { product: 31, quantity: 2 },
      { product: 32, quantity: 1 },
    ])
    await stripeWebhooks['payment_intent.succeeded']({ event, req: asReq(payload) })
    // Line 0 was already decremented before the crash — only line 1 runs.
    expect(store.products[0].inventory).toBe(10)
    expect(store.products[1].inventory).toBe(9)
    expect(store.transactions[0].inventoryProgress).toBe(2)
    expect(store.transactions[0].status).toBe('succeeded')
  })

  it('#286 a stolen claim aborts mid-loop — fencing token prevents double decrement', async () => {
    // The stale-claim window (>60s) assumes the old worker is dead. If it is
    // merely stalled and resumes after a re-claim, it must not keep
    // decrementing from its in-memory position — the settlementToken fence
    // aborts it before the next line.
    const { payload, store } = makePayload({
      transactions: [
        pendingTxn({ items: [{ product: 31, quantity: 1 }, { product: 32, quantity: 1 }] }),
      ],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 10 }, { id: 32, inventory: 10 }],
    })
    const realUpdateOne = payload.db.updateOne
    let txnWrites = 0
    payload.db.updateOne = vi.fn(async (args: any) => {
      const row = await realUpdateOne(args)
      // A re-claimer steals the claim right after the worker's claim write.
      if (args.collection === 'transactions' && ++txnWrites === 2) {
        store.transactions[0].settlementToken = 'stolen-by-reclaimer'
      }
      return row
    })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store.products[0].inventory).toBe(9) // line 0 ran before the theft landed
    expect(store.products[1].inventory).toBe(10) // line 1 blocked by the fence
    expect(store.transactions[0].status).toBe('processing') // thief owns settlement
    expect(payload.logger.warn).toHaveBeenCalled()
  })

  it('#280 charge.succeeded drives settlement via the resolved payment intent id', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn()],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    await stripeWebhooks['charge.succeeded']({
      event: {
        id: 'evt_charge',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_1', payment_intent: 'pi_test_1', amount: 129900, currency: 'eur' } },
      },
      req: asReq(payload),
    })
    expect(store.orders).toHaveLength(1)
    expect(store.transactions[0].status).toBe('succeeded')
    expect(store.products[0].inventory).toBe(4)
  })

  it('#281 usage counts the charge-time snapshot (discountCodeApplied), not a mutated cart', async () => {
    const { payload, store } = makePayload({
      // Cart was re-edited mid-payment: discountCode now points at 66, but the
      // charge was priced with 55 (snapshotted on the transaction at initiation).
      transactions: [pendingTxn({ status: 'succeeded', order: 55, discountCodeApplied: 55 })],
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
      carts: [{ id: 3, discountCode: 66 }],
    })
    store['discount-codes'].push(
      { id: 55, code: 'SAVE10', usedCount: 0 },
      { id: 66, code: 'OTHER', usedCount: 0 },
    )
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(1)
    expect(store['discount-codes'][1].usedCount).toBe(0)
  })

  it('#282 maxUses is enforced at increment time (atomic conditional update)', async () => {
    const { payload, store } = makePayload({
      transactions: [pendingTxn({ status: 'succeeded', order: 55, discountCodeApplied: 55 })],
      orders: [{ id: 55, status: 'processing', transactions: [7] }],
      carts: [{ id: 3 }],
    })
    store['discount-codes'].push({ id: 55, code: 'SAVE10', usedCount: 5, maxUses: 5 })
    await stripeWebhooks['payment_intent.succeeded']({ event: succeededEvent(), req: asReq(payload) })
    expect(store['discount-codes'][0].usedCount).toBe(5)
    expect(payload.logger.warn).toHaveBeenCalled()
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

  it('#186 composite line settles: per-component stock decrement, no crash', async () => {
    // Pass-2 audit: the old loop threw "inventory item without product/variant
    // id" on configured-build lines → order created but transaction stuck
    // 'processing' forever. Now the registered line type supplies stock units.
    registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => ({ price: 0, subItems: [], fulfillmentUnits: 0 }),
      resolveStockUnits: async () => [
        { variant: 41, quantity: 1 },
        { variant: 42, quantity: 2 },
      ],
    })
    const compositeTxn = pendingTxn({
      items: [
        { lineType: 'configured-build', configuredBuild: 8, buildName: 'Probe', quantity: 1 },
        { product: 31, quantity: 1 },
      ],
    })
    const { payload, store } = makePayload({
      transactions: [compositeTxn],
      carts: [{ id: 3 }],
      products: [{ id: 31, inventory: 5 }],
    })
    store.variants.push(
      { id: 41, inventory: 10 },
      { id: 42, inventory: 10 },
    )
    const event = succeededEvent()
    event.data.object.metadata.cartItemsSnapshot = JSON.stringify(compositeTxn.items)
    await stripeWebhooks['payment_intent.succeeded']({ event, req: asReq(payload) })
    expect(store.transactions[0].status).toBe('succeeded')
    expect(store.orders).toHaveLength(1)
    expect(store.variants[0].inventory).toBe(9)
    expect(store.variants[1].inventory).toBe(8)
    expect(store.products[0].inventory).toBe(4)
  })

  it('#187 line type without stock resolver settles with a warn, no crash', async () => {
    registerLineItemType({
      slug: 'gift-card',
      label: 'Gift card',
      resolveLine: async () => ({ price: 0, subItems: [], fulfillmentUnits: 0 }),
    })
    const txn = pendingTxn({
      items: [{ lineType: 'gift-card', quantity: 1 }],
    })
    const { payload, store } = makePayload({ transactions: [txn], carts: [{ id: 3 }] })
    const event = succeededEvent()
    event.data.object.metadata.cartItemsSnapshot = JSON.stringify(txn.items)
    await stripeWebhooks['payment_intent.succeeded']({ event, req: asReq(payload) })
    expect(store.transactions[0].status).toBe('succeeded')
    expect(store.orders).toHaveLength(1)
    expect(payload.logger.warn).toHaveBeenCalled()
  })
})

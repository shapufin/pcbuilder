import { describe, it, expect, vi } from 'vitest'
import { registerLineItemType } from '@buildmyrig/lib'
import { cartConfirmFreeEndpoint } from './endpoints.ts'

type Row = Record<string, any>

/**
 * POST /api/carts/:id/confirm-free — the non-Stripe confirm path for carts
 * whose server-computed total is €0 (fully discounted). Stripe rejects €0
 * PaymentIntents, so without this endpoint a €0 cart could never become an
 * order. The endpoint reuses the webhook settlement core (CAS claim +
 * fencing token + resumable decrement) via a synthetic settlement key.
 */
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

const makePayload = (
  initial: {
    carts?: Row[]
    transactions?: Row[]
    orders?: Row[]
    products?: Row[]
    variants?: Row[]
    discountCodes?: Row[]
  } = {},
) => {
  const store: Record<string, Row[]> = {
    carts: initial.carts ?? [],
    transactions: initial.transactions ?? [],
    orders: initial.orders ?? [],
    products: initial.products ?? [],
    variants: initial.variants ?? [],
    'discount-codes': initial.discountCodes ?? [],
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
      const docs = (store[collection] ?? []).filter((r) => matchWhere(r, where)).slice(0, limit ?? 10)
      return { docs, totalDocs: docs.length }
    }),
    findByID: vi.fn(async ({ id, collection }: any) =>
      (store[collection] ?? []).find((r) => String(r.id) === String(id)) ?? null,
    ),
    create: vi.fn(async ({ collection, data }: any) => {
      const row = { id: nextId++, ...data }
      store[collection].push(row)
      return row
    }),
    update: vi.fn(async ({ id, collection, data, where }: any) => {
      const found = (store[collection] ?? []).find((r) => String(r.id) === String(id))
      const rows = where
        ? (store[collection] ?? []).filter((r) => matchWhere(r, where))
        : found
          ? [found]
          : []
      if (rows.length === 0) return null
      for (const row of rows) applyData(row, data)
      return rows[0]
    }),
    db: {
      updateOne: vi.fn(async ({ collection, data, where, id }: any) => {
        const row = (store[collection] ?? []).find((r) =>
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

const asReq = (payload: any, over: Row = {}): any => ({
  payload,
  headers: new Headers({ 'x-forwarded-for': over.ip ?? '9.9.9.9' }),
  json: async () => over.body ?? {},
  routeParams: over.routeParams ?? {},
  user: over.user ?? null,
})

const ADDR = { line1: 'Rue 1', city: 'Berlin', postalCode: '10115', country: 'DE' }

const freeCart = (over: Row = {}): Row => ({
  id: 3,
  customer: null,
  secret: 's3cret',
  subtotal: 5_000,
  discountTotal: 5_000,
  shippingTotal: 0,
  taxTotal: 0,
  total: 0,
  items: [{ product: 31, quantity: 1 }],
  ...over,
})

// Unique IP per call site: the module-level rate limiter (10/min) would
// otherwise be exhausted by the suite itself.
let ipSeq = 0
const call = (
  payload: any,
  over: { routeParams?: Row; body?: Row; user?: Row | null; ip?: string } = {},
): Promise<Response> =>
  cartConfirmFreeEndpoint.handler!(
    asReq(payload, {
      routeParams: { id: '3', ...over.routeParams },
      body: { customerEmail: 'buyer@example.com', shippingAddress: ADDR, ...over.body },
      user: over.user ?? null,
      ip: over.ip ?? `9.9.9.${++ipSeq}`,
    }),
  ) as Promise<Response>

describe('POST /api/carts/:id/confirm-free', () => {
  it('#383 rejects a non-free cart with 422 — client totals are never trusted', async () => {
    const { payload, store } = makePayload({ carts: [freeCart({ total: 500 })] })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(422)
    expect(store.orders).toHaveLength(0)
    expect(store.transactions).toHaveLength(0)
    expect(store.carts[0].purchasedAt).toBeUndefined()
  })

  it('#384 rejects an empty cart with 422', async () => {
    const { payload, store } = makePayload({ carts: [freeCart({ items: [] })] })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(422)
    expect(store.transactions).toHaveLength(0)
  })

  it('#385 404s for a non-owner without the secret (existence not leaked)', async () => {
    const { payload, store } = makePayload({ carts: [freeCart({ customer: 12 })] })
    const res = await call(payload, { user: { id: 99 } })
    expect(res.status).toBe(404)
    expect(store.orders).toHaveLength(0)
    expect(store.transactions).toHaveLength(0)
  })

  it('#386 guest + secret: €0 cart settles into a real order, stock decremented', async () => {
    const { payload, store } = makePayload({
      carts: [freeCart()],
      products: [{ id: 31, inventory: 5 }],
    })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(store.orders).toHaveLength(1)
    expect(store.orders[0]).toMatchObject({
      status: 'processing',
      amount: 0,
      currency: 'EUR',
      customerEmail: 'buyer@example.com',
    })
    expect(store.orders[0].shippingAddress).toMatchObject({ city: 'Berlin', country: 'DE' })
    expect(store.orders[0].items).toEqual([{ product: 31, quantity: 1 }])
    expect(store.transactions).toHaveLength(1)
    expect(store.transactions[0]).toMatchObject({
      status: 'succeeded',
      amount: 0,
      paymentProvider: 'free',
      inventoryComplete: true,
      order: store.orders[0].id,
    })
    expect(store.carts[0].purchasedAt).toBeTruthy()
    expect(store.products[0].inventory).toBe(4)
    expect(body.orderId).toBe(store.orders[0].id)
  })

  it('#387 logged-in owner settles with customer relation, no secret needed', async () => {
    const { payload, store } = makePayload({
      carts: [freeCart({ customer: 12 })],
      products: [{ id: 31, inventory: 5 }],
    })
    const res = await call(payload, { user: { id: 12 } })
    expect(res.status).toBe(200)
    expect(store.orders[0].customer).toBe(12)
    expect(store.transactions[0].customer).toBe(12)
  })

  it('#388 discount usage counted exactly once; replay returns the same order', async () => {
    const { payload, store } = makePayload({
      carts: [freeCart({ discountCode: 55 })],
      products: [{ id: 31, inventory: 5 }],
      discountCodes: [{ id: 55, code: 'FREE100', type: 'percentage', value: 100, enabled: true, usedCount: 0 }],
    })
    const first = await call(payload, { body: { secret: 's3cret' } })
    expect(first.status).toBe(200)
    const firstBody = await first.json()
    expect(store['discount-codes'][0].usedCount).toBe(1)
    // Retry (double-submit/refresh): cart is already purchased → same order, no second decrement.
    const second = await call(payload, { body: { secret: 's3cret' } })
    expect(second.status).toBe(200)
    const secondBody = await second.json()
    expect(secondBody.orderId).toBe(firstBody.orderId)
    expect(secondBody.alreadyConfirmed).toBe(true)
    expect(store.orders).toHaveLength(1)
    expect(store.products[0].inventory).toBe(4)
    expect(store['discount-codes'][0].usedCount).toBe(1)
  })

  it('#389 crash-after-claim resume: pending transaction settles, no duplicate created', async () => {
    // First attempt claimed the cart + created the tx, then died. The retry
    // must find and settle that transaction instead of minting another.
    const { payload, store } = makePayload({
      carts: [freeCart({ purchasedAt: '2026-10-05T00:00:00.000Z' })],
      transactions: [
        {
          id: 7,
          status: 'pending',
          cart: 3,
          amount: 0,
          currency: 'EUR',
          customerEmail: 'buyer@example.com',
          paymentProvider: 'free',
          items: [{ product: 31, quantity: 1 }],
        },
      ],
      products: [{ id: 31, inventory: 5 }],
    })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(200)
    expect(store.transactions).toHaveLength(1)
    expect(store.transactions[0].status).toBe('succeeded')
    expect(store.orders).toHaveLength(1)
    expect(store.products[0].inventory).toBe(4)
  })

  it('#390 cart already purchased without a transaction row → 409', async () => {
    const { payload } = makePayload({
      carts: [freeCart({ purchasedAt: '2026-10-05T00:00:00.000Z' })],
    })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(409)
  })

  it('#391 composite build line decrements its component stock units', async () => {
    registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => ({ price: 0, subItems: [], fulfillmentUnits: 0 }),
      resolveStockUnits: async () => [
        { variant: 41, quantity: 1 },
        { product: 31, quantity: 2 },
      ],
    })
    const { payload, store } = makePayload({
      carts: [
        freeCart({
          items: [{ lineType: 'configured-build', configuredBuild: 8, buildName: 'Rig', quantity: 1 }],
        }),
      ],
      products: [{ id: 31, inventory: 10 }],
      variants: [{ id: 41, inventory: 3 }],
    })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(200)
    expect(store.variants[0].inventory).toBe(2)
    expect(store.products[0].inventory).toBe(8)
    expect(store.transactions[0].status).toBe('succeeded')
  })

  it('#392 failed build validation returns 422 with reasons, nothing created', async () => {
    registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => {
        throw new Error('CPU slot: i9 requires Z790 chipset')
      },
      resolveStockUnits: async () => [],
    })
    const { payload, store } = makePayload({
      carts: [
        freeCart({
          items: [{ lineType: 'configured-build', configuredBuild: 8, quantity: 1 }],
        }),
      ],
      products: [{ id: 31, inventory: 5 }],
    })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.reasons[0]).toMatch(/Z790/)
    expect(store.transactions).toHaveLength(0)
    expect(store.carts[0].purchasedAt).toBeUndefined()
  })

  it('#393 rate limited per IP', async () => {
    const { payload } = makePayload({ carts: [freeCart({ total: 500 })] })
    let last: Response | null = null
    for (let i = 0; i < 25; i++) {
      last = await call(payload, { ip: '7.7.7.7', body: { secret: 's3cret' } })
      if (last.status === 429) break
    }
    expect(last?.status).toBe(429)
  })

  it('#394 transaction-create failure releases the cart claim — retry succeeds', async () => {
    // If create() dies after the cart CAS wins, the cart must NOT stay
    // purchased-forever with no transaction behind it: the claim rolls back
    // (stamp-equality CAS) and a later attempt completes the order.
    const { payload, store } = makePayload({
      carts: [freeCart()],
      products: [{ id: 31, inventory: 5 }],
    })
    payload.create.mockRejectedValueOnce(new Error('column paymentProvider does not exist'))
    const failed = await call(payload, { body: { secret: 's3cret' } })
    expect(failed.status).toBe(500)
    expect(store.transactions).toHaveLength(0)
    expect(store.carts[0].purchasedAt).toBeNull()
    const retry = await call(payload, { body: { secret: 's3cret' } })
    expect(retry.status).toBe(200)
    expect(store.orders).toHaveLength(1)
    expect(store.transactions).toHaveLength(1)
    expect(store.products[0].inventory).toBe(4)
  })

  it('#395 exhausted discount code is rejected at confirm time (SEC-001)', async () => {
    // Apply-time validation is the only gate on maxUses, and settlement's CAS
    // only stops the counter overshooting — it still settles. Without this
    // re-check N pre-loaded carts could each land at €0 on one 1-use code.
    const { payload, store } = makePayload({
      carts: [freeCart({ discountCode: 55 })],
      products: [{ id: 31, inventory: 5 }],
      discountCodes: [
        { id: 55, code: 'FREE100', type: 'percentage', value: 100, enabled: true, maxUses: 1, usedCount: 1 },
      ],
    })
    const res = await call(payload, { body: { secret: 's3cret' } })
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/no longer valid/)
    expect(store.orders).toHaveLength(0)
    expect(store.transactions).toHaveLength(0)
    expect(store.carts[0].purchasedAt).toBeUndefined()
    expect(store['discount-codes'][0].usedCount).toBe(1)
  })
})

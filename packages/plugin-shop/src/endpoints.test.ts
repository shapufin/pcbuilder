import { describe, it, expect, vi } from 'vitest'
import { discountValidateEndpoint, cartApplyDiscountEndpoint, cartShippingCountryEndpoint } from './endpoints.ts'
import { computeCartTotals } from './lib/pricing.ts'

type Row = Record<string, any>

/**
 * Discount endpoints (audit gap P2-C3 / A6):
 * - POST /api/discounts/validate — stateless pre-check for the checkout form.
 * - POST /api/carts/:id/apply-discount — owner-or-secret gated cart mutation;
 *   the cart beforeChange hook recomputes the four totals from the same
 *   computeCartTotals math source.
 */

const makePayload = (initial: { discountCodes?: Row[]; carts?: Row[]; shippingBands?: Row[]; taxRates?: Row[] } = {}) => {
  const store: Record<string, Row[]> = {
    'discount-codes': initial.discountCodes ?? [],
    carts: initial.carts ?? [],
    'shipping-bands': initial.shippingBands ?? [],
    'tax-rates': initial.taxRates ?? [],
  }
  const payload = {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    find: vi.fn(async ({ collection, where, limit }: any) => {
      let docs = store[collection] ?? []
      if (where?.code?.equals !== undefined) {
        docs = docs.filter((r) => String(r.code) === String(where.code.equals))
      }
      if (where?.enabled?.equals !== undefined) {
        docs = docs.filter((r) => Boolean(r.enabled) === Boolean(where.enabled.equals))
      }
      docs = docs.slice(0, limit ?? 100)
      return { docs, totalDocs: docs.length }
    }),
    findByID: vi.fn(async ({ id, collection }: any) =>
      (store[collection] ?? []).find((r) => String(r.id) === String(id)) ?? null,
    ),
    update: vi.fn(async ({ id, collection, data }: any) => {
      const row = (store[collection] ?? []).find((r) => String(r.id) === String(id))
      if (!row) return null
      Object.assign(row, data)
      // Mirror the cart beforeChange hook: totals recompute from live state
      // on every cart write, so the endpoint's read-back sees fresh numbers.
      if (collection === 'carts') {
        const discountId =
          row.discountCode && typeof row.discountCode === 'object' ? row.discountCode.id : row.discountCode
        const totals = computeCartTotals({
          subtotal: row.subtotal ?? 0,
          discountCode: store['discount-codes'].find((c) => String(c.id) === String(discountId)) ?? null,
          shippingBands: store['shipping-bands'],
          taxRates: store['tax-rates'],
        })
        Object.assign(row, totals)
      }
      return row
    }),
  }
  return { payload, store }
}

const asReq = (payload: any, over: Row = {}): any => ({
  payload,
  headers: new Headers({ 'x-forwarded-for': '9.9.9.9' }),
  json: async () => over.body ?? {},
  routeParams: over.routeParams ?? {},
  user: over.user ?? null,
})

const validCode = (over: Row = {}): Row => ({
  id: 55,
  code: 'SAVE10',
  type: 'percentage',
  value: 10,
  enabled: true,
  usedCount: 0,
  ...over,
})

describe('POST /api/discounts/validate', () => {
  it('#202 returns the computed discount for a valid code', async () => {
    const { payload } = makePayload({ discountCodes: [validCode()] })
    const res = await discountValidateEndpoint.handler!(
      asReq(payload, { body: { code: 'SAVE10', subtotal: 10_000 } }),
    ) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ valid: true, discountTotal: 1_000, freeShipping: false })
  })

  it('#203 rejects an unknown code with a reason (no collection internals leaked)', async () => {
    const { payload } = makePayload({ discountCodes: [validCode()] })
    const res = await discountValidateEndpoint.handler!(
      asReq(payload, { body: { code: 'NOPE' } }),
    ) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(typeof body.reason).toBe('string')
    expect(body.reason).not.toMatch(/find|query|collection/i)
  })

  it('#204 rejects a malformed body with 400', async () => {
    const { payload } = makePayload()
    const res = await discountValidateEndpoint.handler!(asReq(payload, { body: {} })) as Response
    expect(res.status).toBe(400)
  })

  it('#205 is rate limited per IP', async () => {
    const { payload } = makePayload({ discountCodes: [validCode()] })
    const req = asReq(payload, { body: { code: 'SAVE10' } })
    let last: Response | null = null
    for (let i = 0; i < 25; i++) {
      last = (await discountValidateEndpoint.handler!(req)) as Response
      if (last.status === 429) break
    }
    expect(last?.status).toBe(429)
  })
})

describe('POST /api/carts/:id/apply-discount', () => {
  const cart = (over: Row = {}): Row => ({
    id: 3,
    customer: 12,
    secret: 's3cret',
    subtotal: 10_000,
    items: [{ product: 31, quantity: 1 }],
    ...over,
  })

  it('#206 applies a valid code for the cart owner and returns recomputed totals', async () => {
    const { payload, store } = makePayload({
      discountCodes: [validCode()],
      carts: [cart()],
      shippingBands: [{ id: 1, label: 'Standard', minSubtotal: 0, price: 595, enabled: true }],
      taxRates: [{ id: 2, rate: 20, isDefault: true, enabled: true }],
    })
    const res = await cartApplyDiscountEndpoint.handler!(
      asReq(payload, {
        routeParams: { id: '3' },
        user: { id: 12 },
        body: { code: 'SAVE10' },
      }),
    ) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    // 10% off 10000 → 9000 goods + 595 shipping = 9595 charge; VAT extracted.
    expect(body.ok).toBe(true)
    expect(body.totals).toMatchObject({ discountTotal: 1_000, shippingTotal: 595, total: 9_595 })
    expect(store.carts[0].discountCode).toBe(55)
  })

  it('#207 accepts a guest cart via its secret', async () => {
    const { payload, store } = makePayload({
      discountCodes: [validCode()],
      carts: [cart({ customer: null })],
    })
    const res = await cartApplyDiscountEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, body: { code: 'SAVE10', secret: 's3cret' } }),
    ) as Response
    expect(res.status).toBe(200)
    expect(store.carts[0].discountCode).toBe(55)
  })

  it('#208 404s for a non-owner without the secret (existence not leaked)', async () => {
    const { payload, store } = makePayload({ discountCodes: [validCode()], carts: [cart()] })
    const res = await cartApplyDiscountEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, user: { id: 99 }, body: { code: 'SAVE10' } }),
    ) as Response
    expect(res.status).toBe(404)
    expect(store.carts[0].discountCode).toBeUndefined()
  })

  it('#209 422s with the shared reason when the code does not validate', async () => {
    const { payload, store } = makePayload({
      discountCodes: [validCode({ enabled: false })],
      carts: [cart()],
    })
    const res = await cartApplyDiscountEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, user: { id: 12 }, body: { code: 'SAVE10' } }),
    ) as Response
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
    expect(store.carts[0].discountCode).toBeUndefined()
  })

  it('#210 404s when the cart does not exist', async () => {
    const { payload } = makePayload({ discountCodes: [validCode()] })
    const res = await cartApplyDiscountEndpoint.handler!(
      asReq(payload, { routeParams: { id: '77' }, user: { id: 12 }, body: { code: 'SAVE10' } }),
    ) as Response
    expect(res.status).toBe(404)
  })
})

describe('POST /api/carts/:id/shipping-country', () => {
  const cart = (over: Row = {}): Row => ({
    id: 3,
    customer: 12,
    secret: 's3cret',
    subtotal: 10_000,
    items: [{ product: 31, quantity: 1 }],
    ...over,
  })

  const taxPayload = () => {
    const { payload, store } = makePayload({
      carts: [cart()],
      shippingBands: [{ id: 1, label: 'Standard', minSubtotal: 0, price: 595, enabled: true }],
      taxRates: [
        { id: 2, rate: 20, isDefault: true, enabled: true },
        { id: 3, country: 'DE', rate: 19, enabled: true },
      ],
    })
    // Mirror the cart beforeChange hook so the response carries fresh totals.
    payload.update.mockImplementation(async ({ id, collection, data }: any) => {
      const row = (store[collection] ?? []).find((r) => String(r.id) === String(id))
      if (!row) return null
      Object.assign(row, data)
      if (collection === 'carts') {
        Object.assign(
          row,
          computeCartTotals({
            subtotal: row.subtotal ?? 0,
            shippingBands: store['shipping-bands'],
            taxRates: store['tax-rates'],
            country: row.shippingCountry,
          }),
        )
      }
      return row
    })
    return { payload, store }
  }

  it('#244 sets the country and returns country-driven totals', async () => {
    const { payload, store } = taxPayload()
    const res = await cartShippingCountryEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, user: { id: 12 }, body: { country: 'de' } }),
    ) as Response
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(store.carts[0].shippingCountry).toBe('DE')
    expect(body.totals.taxTotal).toBe(1_692)
  })

  it('#245 accepts a guest cart via its secret', async () => {
    const { payload, store } = taxPayload()
    store.carts[0].customer = null
    const res = await cartShippingCountryEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, body: { country: 'DE', secret: 's3cret' } }),
    ) as Response
    expect(res.status).toBe(200)
    expect(store.carts[0].shippingCountry).toBe('DE')
  })

  it('#246 rejects a non-ISO country (400) and a non-owner (404)', async () => {
    const { payload, store } = taxPayload()
    const bad = await cartShippingCountryEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, user: { id: 12 }, body: { country: 'Germany' } }),
    ) as Response
    expect(bad.status).toBe(400)
    expect(store.carts[0].shippingCountry).toBeUndefined()

    const foreign = await cartShippingCountryEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, user: { id: 99 }, body: { country: 'DE' } }),
    ) as Response
    expect(foreign.status).toBe(404)
  })

  it('#247 an empty country clears it and returns default-rate totals', async () => {
    const { payload, store } = taxPayload()
    store.carts[0].shippingCountry = 'DE'
    const res = await cartShippingCountryEndpoint.handler!(
      asReq(payload, { routeParams: { id: '3' }, user: { id: 12 }, body: { country: '' } }),
    ) as Response
    expect(res.status).toBe(200)
    expect(store.carts[0].shippingCountry).toBe('')
    const body = await res.json()
    expect(body.totals.taxTotal).toBe(1_766)
  })
})

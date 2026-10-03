import { describe, it, expect, vi } from 'vitest'
import { registerLineItemType } from '@buildmyrig/lib'
import {
  createReservationFromCart,
  releaseReservations,
  convertReservation,
  heldQuantities,
  wrapWithReservations,
  RESERVATION_TTL_MS,
} from './reservations.ts'

type Row = Record<string, any>

/**
 * Inventory reservations (audit gap P2-C6): holds recorded at payment
 * initiation, released on failure/cancel/expiry, converted at settlement.
 * Availability (cart quantity caps) subtracts active holds so two carts
 * can't both reserve the last unit.
 */

const makePayload = (initial: { reservations?: Row[]; carts?: Row[]; products?: Row[]; variants?: Row[] } = {}) => {
  const store: Record<string, Row[]> = {
    'inventory-reservations': initial.reservations ?? [],
    carts: initial.carts ?? [],
    products: initial.products ?? [],
    variants: initial.variants ?? [],
  }
  let nextId = 500
  const payload = {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    find: vi.fn(async ({ collection, where, limit }: any) => {
      let docs = store[collection] ?? []
      docs = filterDocs(docs, where)
      const totalDocs = docs.length
      docs = docs.slice(0, limit ?? 100)
      return { docs, totalDocs }
    }),
    findByID: vi.fn(async ({ id, collection }: any) =>
      (store[collection] ?? []).find((r) => String(r.id) === String(id)) ?? null,
    ),
    create: vi.fn(async ({ collection, data }: any) => {
      const row = { id: nextId++, status: 'held', ...data }
      store[collection].push(row)
      return row
    }),
    update: vi.fn(async ({ id, where, collection, data }: any) => {
      const rows = (store[collection] ?? []).filter((r) =>
        where ? rowsMatch(r, where) : String(r.id) === String(id),
      )
      for (const row of rows) Object.assign(row, data)
      return { docs: rows }
    }),
    db: {
      updateOne: vi.fn(async ({ id, collection, data, where }: any) => {
        const row = (store[collection] ?? []).find((r) =>
          where ? rowsMatch(r, where) : String(r.id) === String(id),
        )
        if (!row) return null
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && '$inc' in (value as Row)) {
            row[key] = (row[key] ?? 0) + (value as { $inc: number }).$inc
          } else {
            row[key] = value
          }
        }
        return row
      }),
    },
  }
  return { payload, store }
}

const rowsMatch = (row: Row, where: any): boolean => {
  if (!where) return true
  if (Array.isArray(where.and)) return where.and.every((w: any) => rowsMatch(row, w))
  if (Array.isArray(where.or)) return where.or.some((w: any) => rowsMatch(row, w))
  for (const [key, cond] of Object.entries<any>(where)) {
    // Dotted array access (`items.variant`) matches when ANY item matches.
    if (key.startsWith('items.')) {
      const field = key.slice('items.'.length)
      const items: Row[] = Array.isArray(row.items) ? row.items : []
      if ('in' in cond) {
        if (!items.some((it) => cond.in.map(String).includes(String(it[field])))) return false
      } else if ('equals' in cond) {
        if (!items.some((it) => String(it[field]) === String(cond.equals))) return false
      } else {
        return false
      }
      continue
    }
    const value = row[key]
    if ('equals' in cond) {
      if (String(value ?? '') !== String(cond.equals)) return false
    } else if ('in' in cond) {
      if (!cond.in.map(String).includes(String(value))) return false
    } else if ('less_than' in cond) {
      if (!(new Date(value).getTime() < new Date(cond.less_than).getTime())) return false
    } else if ('greater_than' in cond) {
      if (!(new Date(value).getTime() > new Date(cond.greater_than).getTime())) return false
    } else if ('not_equals' in cond) {
      if (String(value ?? '') === String(cond.not_equals)) return false
    } else {
      return false
    }
  }
  return true
}

const filterDocs = (docs: Row[], where: any): Row[] => docs.filter((r) => rowsMatch(r, where))

const asReq = (payload: any): any => ({ payload })

const registerComposite = () => {
  registerLineItemType({
    slug: 'configured-build',
    label: 'Configured build',
    resolveLine: async () => ({ price: 100, subItems: [], fulfillmentUnits: 2 }),
    resolveStockUnits: async () => [{ variant: 77, quantity: 1 }],
  })
}

describe('createReservationFromCart', () => {
  it('#218 flattens standard + composite lines into stock-unit holds', async () => {
    registerComposite()
    const { payload, store } = makePayload()
    const cart = {
      id: 3,
      items: [
        { lineType: 'standard', product: 31, variant: 41, quantity: 2 },
        { lineType: 'configured-build', configuredBuild: 'b1', quantity: 3 },
      ],
    }
    await createReservationFromCart({ payload: payload as never, req: asReq(payload as never), cart: cart as never, paymentIntentID: 'pi_1' })
    expect(store['inventory-reservations']).toHaveLength(1)
    const doc = store['inventory-reservations'][0]
    expect(doc).toMatchObject({ paymentIntentID: 'pi_1', cart: 3, status: 'held' })
    expect(doc.items).toEqual([
      { lineType: 'standard', variant: 41, quantity: 2 },
      { lineType: 'configured-build', variant: 77, quantity: 3 },
    ])
    const ttl = new Date(doc.expiresAt).getTime() - Date.now()
    expect(ttl).toBeGreaterThan(RESERVATION_TTL_MS - 5000)
    expect(ttl).toBeLessThanOrEqual(RESERVATION_TTL_MS)
  })

  it('#219 normalizes populated relationship objects', async () => {
    const { payload, store } = makePayload()
    const cart = { id: 3, items: [{ lineType: 'standard', product: { id: 31 }, variant: { id: 41 }, quantity: 1 }] }
    await createReservationFromCart({ payload: payload as never, req: asReq(payload as never), cart: cart as never, paymentIntentID: 'pi_2' })
    expect(store['inventory-reservations'][0].items).toEqual([{ lineType: 'standard', variant: 41, quantity: 1 }])
  })

  it('#220 sweeps expired holds to released on the next initiate', async () => {
    const { payload, store } = makePayload({
      reservations: [{ id: 1, paymentIntentID: 'pi_old', status: 'held', expiresAt: new Date(Date.now() - 1000).toISOString(), items: [] }],
    })
    const cart = { id: 3, items: [{ lineType: 'standard', product: 31, quantity: 1 }] }
    await createReservationFromCart({ payload: payload as never, req: asReq(payload as never), cart: cart as never, paymentIntentID: 'pi_new' })
    expect(store['inventory-reservations'][0].status).toBe('released')
    expect(store['inventory-reservations']).toHaveLength(2)
  })

  it('#221 never throws on resolveStockUnits failure (hold is best-effort)', async () => {
    registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => ({ price: 100, subItems: [], fulfillmentUnits: 1 }),
      resolveStockUnits: async () => {
        throw new Error('build vanished')
      },
    })
    const { payload, store } = makePayload()
    const cart = { id: 3, items: [{ lineType: 'configured-build', configuredBuild: 'gone', quantity: 1 }] }
    await expect(
      createReservationFromCart({ payload: payload as never, req: asReq(payload as never), cart: cart as never, paymentIntentID: 'pi_3' }),
    ).resolves.toBeUndefined()
    // Standard-less line contributed no units; the reservation still exists.
    expect(store['inventory-reservations']).toHaveLength(1)
  })
})

describe('releaseReservations', () => {
  it('#222 releases held reservations for a payment intent; converted stay untouched', async () => {
    const { payload, store } = makePayload({
      reservations: [
        { id: 1, paymentIntentID: 'pi_1', status: 'held', items: [] },
        { id: 2, paymentIntentID: 'pi_1', status: 'converted', items: [] },
        { id: 3, paymentIntentID: 'pi_other', status: 'held', items: [] },
      ],
    })
    await releaseReservations(payload as never, asReq(payload as never), 'pi_1')
    expect(store['inventory-reservations'][0].status).toBe('released')
    expect(store['inventory-reservations'][1].status).toBe('converted')
    expect(store['inventory-reservations'][2].status).toBe('held')
  })
})

describe('convertReservation', () => {
  const heldReservation = (over: Row = {}): Row => ({
    id: 9,
    paymentIntentID: 'pi_1',
    status: 'held',
    items: [
      { lineType: 'standard', variant: 41, quantity: 2 },
      { lineType: 'configured-build', variant: 77, quantity: 3 },
    ],
    ...over,
  })

  it('#223 decrementComposite=true decrements ONLY composite units (poll already did standard)', async () => {
    const { payload, store } = makePayload({
      reservations: [heldReservation()],
      variants: [{ id: 41, inventory: 10 }, { id: 77, inventory: 5 }],
    })
    await convertReservation(payload as never, asReq(payload as never), 'pi_1', { decrementComposite: true })
    expect(store.variants.find((v) => v.id === 41)?.inventory).toBe(10) // untouched
    expect(store.variants.find((v) => v.id === 77)?.inventory).toBe(2) // 5 - 3
    expect(store['inventory-reservations'][0].status).toBe('converted')
  })

  it('#224 decrementComposite=false decrements nothing (webhook settlement already did)', async () => {
    const { payload, store } = makePayload({
      reservations: [heldReservation()],
      variants: [{ id: 41, inventory: 10 }, { id: 77, inventory: 5 }],
    })
    await convertReservation(payload as never, asReq(payload as never), 'pi_1', { decrementComposite: false })
    expect(store.variants.find((v) => v.id === 41)?.inventory).toBe(10)
    expect(store.variants.find((v) => v.id === 77)?.inventory).toBe(5)
    expect(store['inventory-reservations'][0].status).toBe('converted')
  })

  it('#225 is a no-op when the reservation is not held (replay safety)', async () => {
    const { payload, store } = makePayload({
      reservations: [heldReservation({ status: 'converted' })],
      variants: [{ id: 77, inventory: 5 }],
    })
    await convertReservation(payload as never, asReq(payload as never), 'pi_1', { decrementComposite: true })
    expect(store.variants[0].inventory).toBe(5)
  })

  it('#226 is a no-op without a reservation (keyless legacy flows)', async () => {
    const { payload } = makePayload()
    await expect(
      convertReservation(payload as never, asReq(payload as never), 'pi_missing', { decrementComposite: true }),
    ).resolves.toBeUndefined()
  })

  it('#258 a superseded/released hold is still convertible (late settlement keeps composite stock honest)', async () => {
    const { payload, store } = makePayload({
      reservations: [heldReservation({ status: 'released' })],
      variants: [{ id: 77, inventory: 5 }],
    })
    await convertReservation(payload as never, asReq(payload as never), 'pi_1', { decrementComposite: true })
    expect(store.variants.find((v) => v.id === 77)?.inventory).toBe(2)
    expect(store['inventory-reservations'][0].status).toBe('converted')
  })

  it('#259 a converted hold is never converted twice (atomic claim, all statuses)', async () => {
    const { payload, store } = makePayload({
      reservations: [heldReservation({ status: 'converted' })],
      variants: [{ id: 77, inventory: 5 }],
    })
    await convertReservation(payload as never, asReq(payload as never), 'pi_1', { decrementComposite: true })
    expect(store.variants[0].inventory).toBe(5)
  })

  it('#260 availability skips the query entirely when the cart has no standard SKUs', async () => {
    const { payload } = makePayload()
    const held = await heldQuantities(payload as never, asReq(payload as never), {
      variantIds: [],
      productIds: [],
    })
    expect(held.size).toBe(0)
    expect(payload.find).not.toHaveBeenCalled()
  })

  it('#231 concurrent conversions decrement composite stock exactly once (atomic claim)', async () => {
    const { payload, store } = makePayload({
      reservations: [heldReservation()],
      variants: [{ id: 77, inventory: 5 }],
    })
    await Promise.all([
      convertReservation(payload as never, asReq(payload as never), 'pi_1', { decrementComposite: true }),
      convertReservation(payload as never, asReq(payload as never), 'pi_1', { decrementComposite: true }),
    ])
    // Two Stripe deliveries racing on a poll-won transaction must not double-decrement.
    expect(store.variants.find((v) => v.id === 77)?.inventory).toBe(2)
    expect(store['inventory-reservations'][0].status).toBe('converted')
  })
})

describe('heldQuantities', () => {
  it('#227 sums active holds per stock target; expired holds are excluded', async () => {
    const { payload } = makePayload({
      reservations: [
        { id: 1, status: 'held', expiresAt: new Date(Date.now() + 60_000).toISOString(), items: [{ variant: 41, quantity: 2 }] },
        { id: 2, status: 'held', expiresAt: new Date(Date.now() + 60_000).toISOString(), items: [{ variant: 41, quantity: 1 }, { product: 31, quantity: 4 }] },
        { id: 3, status: 'held', expiresAt: new Date(Date.now() - 60_000).toISOString(), items: [{ variant: 41, quantity: 100 }] },
        { id: 4, status: 'released', expiresAt: new Date(Date.now() + 60_000).toISOString(), items: [{ variant: 41, quantity: 50 }] },
      ],
    })
    const held = await heldQuantities(payload as never, asReq(payload as never))
    expect(held.get('variant:41')).toBe(3)
    expect(held.get('product:31')).toBe(4)
    expect(held.has('variant:77')).toBe(false)
  })

  it('#255 scopes the query to the given targets (bounded, not a global scan)', async () => {
    const { payload } = makePayload({
      reservations: [
        { id: 1, status: 'held', expiresAt: new Date(Date.now() + 60_000).toISOString(), items: [{ variant: 41, quantity: 2 }] },
        { id: 2, status: 'held', expiresAt: new Date(Date.now() + 60_000).toISOString(), items: [{ variant: 77, quantity: 9 }] },
      ],
    })
    const held = await heldQuantities(payload as never, asReq(payload as never), {
      variantIds: [41],
      productIds: [],
    })
    expect(held.get('variant:41')).toBe(2)
    expect(held.has('variant:77')).toBe(false)

    const call = payload.find.mock.calls.at(-1)?.[0]
    const scoped = JSON.stringify(call.where)
    expect(scoped).toContain('items.variant')
    expect(scoped).toContain('41')
  })

  it('#256 logs a warning when the held-reservation page cap is hit (bound is visible)', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      status: 'held',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      items: [{ variant: 41, quantity: 1 }],
    }))
    const { payload } = makePayload({ reservations: rows })
    // Force a page cap below the row count so the warn path is exercised.
    const held = await heldQuantities(payload as never, asReq(payload as never), undefined, 2)
    expect(held.get('variant:41')).toBe(2)
    expect(payload.logger.warn).toHaveBeenCalledWith(expect.stringContaining('cap'))
  })
})

describe('reservation supersede (plan item C4)', () => {
  it('#257 creating a hold releases the cart’s previous held holds', async () => {
    const { payload, store } = makePayload({
      reservations: [
        { id: 1, paymentIntentID: 'pi_old', cart: 3, status: 'held', items: [{ variant: 41, quantity: 5 }] },
        { id: 2, paymentIntentID: 'pi_other', cart: 4, status: 'held', items: [{ variant: 41, quantity: 5 }] },
      ],
    })
    const cart = { id: 3, items: [{ lineType: 'standard', product: 31, variant: 41, quantity: 1 }] }
    await createReservationFromCart({
      payload: payload as never,
      req: asReq(payload as never),
      cart: cart as never,
      paymentIntentID: 'pi_new',
    })
    // 'superseded' (not 'released'): the status stays distinguishable so a
    // late-settling PI can still convert it for the composite decrement;
    // availability counts 'held' only, so it stops blocking either way.
    expect(store['inventory-reservations'][0].status).toBe('superseded')
    expect(store['inventory-reservations'][1].status).toBe('held')
    expect(store['inventory-reservations'][2]).toMatchObject({ paymentIntentID: 'pi_new', status: 'held' })
  })
})

describe('wrapWithReservations', () => {
  it('#228 creates the hold after a successful initiatePayment and returns the result', async () => {
    registerComposite()
    const { payload, store } = makePayload()
    const upstream = vi.fn(async (args: unknown) => ({
      paymentIntentID: 'pi_9',
      clientSecret: 'cs_9',
      gotCart: (args as { data?: { cart?: unknown } }).data?.cart != null,
    }))
    const wrapped = wrapWithReservations({ initiatePayment: upstream })
    const cart = { id: 3, items: [{ lineType: 'standard', product: 31, variant: 41, quantity: 1 }] }
    const result = (await wrapped.initiatePayment({
      data: { cart },
      req: asReq(payload as never),
    } as never)) as { gotCart?: boolean }
    expect(result).toMatchObject({ paymentIntentID: 'pi_9', gotCart: true })
    expect(upstream).toHaveBeenCalledTimes(1)
    expect(store['inventory-reservations']).toHaveLength(1)
    expect(store['inventory-reservations'][0]).toMatchObject({ paymentIntentID: 'pi_9', cart: 3 })
  })

  it('#229 a reservation failure never breaks the payment (warn + original result)', async () => {
    const { payload, store } = makePayload()
    store.carts.push({ id: 3 }) // find of reservations will throw: collection mock missing? no — force create to throw
    payload.create.mockRejectedValueOnce(new Error('db down'))
    const upstream = vi.fn(async (args: unknown) => ({
      paymentIntentID: 'pi_9',
      gotCart: (args as { data?: { cart?: unknown } }).data?.cart != null,
    }))
    const wrapped = wrapWithReservations({ initiatePayment: upstream })
    const cart = { id: 3, items: [{ lineType: 'standard', product: 31, quantity: 1 }] }
    const result = (await wrapped.initiatePayment({
      data: { cart },
      req: asReq(payload as never),
    } as never)) as { gotCart?: boolean }
    expect(result).toMatchObject({ paymentIntentID: 'pi_9', gotCart: true })
    expect(payload.logger.warn).toHaveBeenCalled()
  })
})

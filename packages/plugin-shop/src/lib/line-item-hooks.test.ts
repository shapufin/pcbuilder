import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CartBeforeChangeHook } from './line-item-hooks'

const importFresh = async () => {
  vi.resetModules()
  const hooks = await import('./line-item-hooks')
  const lib = await import('@buildmyrig/lib')
  return { hooks, lib }
}

type TestItem = {
  lineType?: string
  configuredBuild?: string
  quantity?: number
  product?: string | number
  variant?: string | number
}
type TestData = { items: TestItem[]; subtotal?: number }

const makeReq = () =>
  ({
    payload: {},
    headers: { get: () => '1.2.3.4' },
    query: {},
  } as never)

const makeDefaultHook = (subtotal: number): CartBeforeChangeHook => async ({ data }) => {
  data.subtotal = subtotal
}

describe('line-item hooks (plugin-shop)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('wrapCartBeforeChange delegates standard-only carts to the default hook', async () => {
    const { hooks } = await importFresh()
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(5000))
    const data: TestData = { items: [{ lineType: 'standard' }] }
    await hook({ data, req: makeReq() })
    expect(data.subtotal).toBe(5000)
    expect(data.items).toEqual([{ lineType: 'standard' }])
  })

  it('wrapCartBeforeChange resolves composite lines and restores items', async () => {
    const { hooks, lib } = await importFresh()
    lib.registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => ({ price: 62800, subItems: [], fulfillmentUnits: 2 }),
    })
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(5000))
    const data: TestData = {
      items: [{ lineType: 'standard' }, { lineType: 'configured-build', configuredBuild: 'b1', quantity: 1 }],
    }
    await hook({ data, req: makeReq() })
    expect(data.subtotal).toBe(5000 + 62800)
    expect(data.items).toHaveLength(2)
    expect(data.items[1]).toMatchObject({ lineType: 'configured-build', configuredBuild: 'b1' })
  })

  it('wrapCartBeforeChange ignores unknown line types (safe default)', async () => {
    const { hooks } = await importFresh()
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(0))
    const data: TestData = { items: [{ lineType: 'mystery-box' }] }
    await hook({ data, req: makeReq() })
    expect(data.subtotal).toBe(0)
  })

  it('wrapCartBeforeChange is a no-op without items', async () => {
    const { hooks } = await importFresh()
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(0))
    const data: { subtotal?: number } = {}
    await hook({ data, req: makeReq() })
    expect(data.subtotal).toBe(0)
  })

  it('validateBuildsAtCheckout delegates to the registered resolveLine', async () => {
    const { hooks, lib } = await importFresh()
    const calls: unknown[] = []
    lib.registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async (line) => {
        calls.push(line)
        return { price: 100, subItems: [], fulfillmentUnits: 1 }
      },
    })
    const data: TestData = {
      items: [
        { lineType: 'standard', product: 'p1' },
        { lineType: 'configured-build', configuredBuild: 'b1' },
      ],
    }
    await hooks.validateBuildsAtCheckout({ data, req: makeReq() })
    expect(calls).toEqual([{ lineType: 'configured-build', configuredBuild: 'b1' }])
  })

  it('validateBuildsAtCheckout propagates resolveLine errors (checkout aborts)', async () => {
    const { hooks, lib } = await importFresh()
    lib.registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => {
        throw new Error('Build "X" is no longer compatible: sockets do not match')
      },
    })
    const data: TestData = { items: [{ lineType: 'configured-build', configuredBuild: 'b1' }] }
    await expect(hooks.validateBuildsAtCheckout({ data, req: makeReq() })).rejects.toThrow(/no longer compatible/)
  })

  it('validateBuildsAtCheckout only runs on create (webhook status updates are not re-validated)', async () => {
    const { hooks, lib } = await importFresh()
    let calls = 0
    lib.registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => {
        calls++
        return { price: 100, subItems: [], fulfillmentUnits: 1 }
      },
    })
    const data: TestData = { items: [{ lineType: 'configured-build', configuredBuild: 'b1' }] }
    await hooks.validateBuildsAtCheckout({ data, req: makeReq(), operation: 'update' })
    expect(calls).toBe(0)
    await hooks.validateBuildsAtCheckout({ data, req: makeReq(), operation: 'create' })
    expect(calls).toBe(1)
  })

  it('collectBuildIssues aggregates reasons across every failing build line', async () => {
    const { hooks, lib } = await importFresh()
    lib.registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async (line) => {
        if (line.configuredBuild === 'bad-1') throw new Error('Build A: CPU and board sockets differ')
        if (line.configuredBuild === 'bad-2') throw new Error('Build B: PSU too small')
        return { price: 100, subItems: [], fulfillmentUnits: 1 }
      },
    })
    const items: TestItem[] = [
      { lineType: 'standard', product: 'p1' },
      { lineType: 'configured-build', configuredBuild: 'bad-1' },
      { lineType: 'configured-build', configuredBuild: 'ok-1' },
      { lineType: 'configured-build', configuredBuild: 'bad-2' },
    ]
    const reasons = await hooks.collectBuildIssues(items, makeReq())
    expect(reasons).toEqual([
      'Build A: CPU and board sockets differ',
      'Build B: PSU too small',
    ])
  })

  it('collectBuildIssues returns [] for a healthy cart', async () => {
    const { hooks, lib } = await importFresh()
    lib.registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async () => ({ price: 100, subItems: [], fulfillmentUnits: 1 }),
    })
    const items: TestItem[] = [
      { lineType: 'standard', product: 'p1' },
      { lineType: 'configured-build', configuredBuild: 'b1' },
    ]
    expect(await hooks.collectBuildIssues(items, makeReq())).toEqual([])
  })

  it('compositeCartItemMatcher merges the same build, not different ones', async () => {
    const { hooks } = await importFresh()
    const matcher = hooks.compositeCartItemMatcher()
    const line = { lineType: 'configured-build', configuredBuild: 'b1' }
    expect(matcher({ existingItem: line, newItem: { ...line, quantity: 1 } })).toBe(true)
    expect(
      matcher({ existingItem: line, newItem: { lineType: 'configured-build', configuredBuild: 'b2' } }),
    ).toBe(false)
    expect(matcher({ existingItem: { product: 'p1' }, newItem: { product: 'p1', variant: 'v1' } })).toBe(false)
    expect(matcher({ existingItem: { product: 'p1' }, newItem: { product: 'p1' } })).toBe(true)
  })

  it('#188 matcher normalizes populated relationship objects (merge passes docs)', async () => {
    // Pass-2 audit: /:id/merge feeds populated docs to the matcher — raw ===
    // on objects never matches, so standard items would duplicate on login.
    const { hooks } = await importFresh()
    const matcher = hooks.compositeCartItemMatcher()
    expect(
      matcher({ existingItem: { product: { id: 'p1' } }, newItem: { product: 'p1' } }),
    ).toBe(true)
    expect(
      matcher({
        existingItem: { configuredBuild: { id: 'b1' } },
        newItem: { lineType: 'configured-build', configuredBuild: 'b1' },
      }),
    ).toBe(true)
    expect(
      matcher({
        existingItem: { configuredBuild: { id: 'b1' } },
        newItem: { lineType: 'configured-build', configuredBuild: 'b2' },
      }),
    ).toBe(false)
  })

  it('#200 recomputeCartTotals derives discount/shipping/tax/total from live collections', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      findByID: vi.fn(async () => ({ id: 55, code: 'SAVE10', type: 'percentage', value: 10, enabled: true })),
      find: vi.fn(async ({ collection }: any) => ({
        docs:
          collection === 'shipping-bands'
            ? [{ id: 1, label: 'Standard', minSubtotal: 0, price: 595, enabled: true }]
            : [{ id: 2, rate: 20, isDefault: true, enabled: true }],
        totalDocs: 1,
      })),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(10_000))
    const data: TestData & Record<string, unknown> = {
      items: [{ lineType: 'standard' }],
      discountCode: 55,
    }
    await hook({ data, req: { payload } as never })
    // 10% off 10000 → 9000 goods + 595 shipping = 9595 charge; VAT extracted.
    expect(data.discountTotal).toBe(1_000)
    expect(data.shippingTotal).toBe(595)
    expect(data.taxTotal).toBe(1_599)
    expect(data.total).toBe(9_595)
  })

  it('#201 recomputeCartTotals fails open (zeroed totals) without collections/logger', async () => {
    const { hooks } = await importFresh()
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(7_000))
    const data: TestData & Record<string, unknown> = { items: [{ lineType: 'standard' }] }
    await hook({ data, req: makeReq() })
    expect(data.subtotal).toBe(7_000)
    expect(data.discountTotal).toBe(0)
    expect(data.shippingTotal).toBe(0)
    expect(data.taxTotal).toBe(0)
    expect(data.total).toBe(7_000)
  })

  it('#211 cart quantity caps subtract active reservations (oversell guard)', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      findByID: vi.fn(async () => null),
      find: vi.fn(async ({ collection, where }: any) => {
        if (collection === 'inventory-reservations') {
          return {
            docs: [
              { id: 1, status: 'held', expiresAt: new Date(Date.now() + 60_000).toISOString(), items: [{ variant: 41, quantity: 3 }] },
            ],
            totalDocs: 1,
          }
        }
        const ids: Array<string | number> = where?.id?.in ?? []
        if (collection === 'variants') {
          return {
            docs: ids.filter((id) => Number(id) === 41).map((id) => ({ id, inventory: 5, product: 31 })),
            totalDocs: 1,
          }
        }
        if (collection === 'products') {
          return { docs: ids.map((id) => ({ id, inventory: 9 })), totalDocs: ids.length }
        }
        return { docs: [], totalDocs: 0 }
      }),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(0))
    const data: TestData & Record<string, unknown> = {
      items: [{ lineType: 'standard', variant: 41, product: 31, quantity: 10 }],
    }
    await hook({ data, req: { payload } as never })
    // 5 on hand − 3 held = 2 available; the merged/over-stock line is capped.
    expect(data.items[0].quantity).toBe(2)
  })

  it('#212 expired reservations do not reduce availability (fail-open on errors)', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      findByID: vi.fn(async () => null),
      find: vi.fn(async ({ collection, where }: any) => {
        if (collection === 'inventory-reservations') {
          let docs = [
            { id: 1, status: 'held', expiresAt: new Date(Date.now() - 60_000).toISOString(), items: [{ variant: 41, quantity: 4 }] },
          ]
          for (const cond of where?.and ?? []) {
            if (cond.status?.equals !== undefined) docs = docs.filter((r) => r.status === cond.status.equals)
            if (cond.expiresAt?.greater_than !== undefined) {
              docs = docs.filter((r) => new Date(r.expiresAt).getTime() > new Date(cond.expiresAt.greater_than).getTime())
            }
          }
          return { docs, totalDocs: docs.length }
        }
        const ids: Array<string | number> = where?.id?.in ?? []
        if (collection === 'variants') {
          return { docs: ids.map((id) => ({ id, inventory: 5, product: 31 })), totalDocs: ids.length }
        }
        if (collection === 'products') {
          return { docs: ids.map((id) => ({ id, inventory: 9 })), totalDocs: ids.length }
        }
        return { docs: [], totalDocs: 0 }
      }),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(0))
    const data: TestData & Record<string, unknown> = {
      items: [{ lineType: 'standard', variant: 41, product: 31, quantity: 10 }],
    }
    await hook({ data, req: { payload } as never })
    expect(data.items[0].quantity).toBe(5)
  })

  /**
   * Audit round 2 (#706-#708) — trash is now the normal delete path, so a
   * product can disappear while its line sits in a cart. `findByID` excludes
   * trashed (and unpublished) docs, which used to land in a bare `catch` that
   * kept the line: the cart kept its stored subtotal and `initiatePayment`
   * charges `cart.total`, so a removed product stayed sellable.
   */
  it('#706 drops a cart line whose product no longer resolves', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      // Only the second product resolves, so only the first line goes.
      find: vi.fn(async ({ collection, where }: any) => {
        if (collection === 'products') {
          const ids: Array<string | number> = where?.id?.in ?? []
          return {
            docs: ids.filter((id) => Number(id) === 35).map((id) => ({ id, inventory: 10 })),
            totalDocs: 1,
          }
        }
        return { docs: [], totalDocs: 0 }
      }),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(54900))
    const data: TestData = {
      items: [
        { lineType: 'standard', product: 34, quantity: 1 },
        { lineType: 'standard', product: 35, quantity: 1 },
      ],
    }
    await hook({ data, req: { payload } as never })
    expect(data.items).toHaveLength(1)
    expect(data.items[0].product).toBe(35)
  })

  it('#707 keeps the line when the lookup fails for a transient reason', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      find: vi.fn(async ({ collection }: any) => {
        if (collection === 'inventory-reservations') return { docs: [], totalDocs: 0 }
        throw Object.assign(new Error('connection reset'), { status: 500 })
      }),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(1000))
    const data: TestData = { items: [{ lineType: 'standard', product: 34, quantity: 1 }] }
    await hook({ data, req: { payload } as never })
    expect(data.items).toHaveLength(1)
  })

  it('#708 drops a variant line whose variant no longer resolves', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      find: vi.fn(async ({ collection, where }: any) => {
        if (collection === 'variants') {
          const ids: Array<string | number> = where?.id?.in ?? []
          return { docs: ids.filter(() => false), totalDocs: 0 }
        }
        return { docs: [], totalDocs: 0 }
      }),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(1000))
    const data: TestData = { items: [{ lineType: 'standard', variant: 41, product: 31, quantity: 2 }] }
    await hook({ data, req: { payload } as never })
    expect(data.items).toHaveLength(0)
  })

  /**
   * #712 — variants are not trash-enabled, so trashing the product leaves the
   * variant resolvable. Checking only the variant kept the line and its price
   * (measured: subtotal 54900 after the parent product was trashed).
   */
  it('#712 drops a variant line when its parent product no longer resolves', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      find: vi.fn(async ({ collection, where }: any) => {
        const ids: Array<string | number> = where?.id?.in ?? []
        if (collection === 'variants') {
          return { docs: [{ id: 34, inventory: 25, product: 34 }], totalDocs: 1 }
        }
        if (collection === 'products') {
          return { docs: ids.filter(() => false), totalDocs: 0 }
        }
        return { docs: [], totalDocs: 0 }
      }),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(54900))
    const data: TestData = { items: [{ lineType: 'standard', variant: 34, product: 34, quantity: 1 }] }
    await hook({ data, req: { payload } as never })
    expect(data.items).toHaveLength(0)
  })

  it('#713 keeps a variant line when the parent product still resolves', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      find: vi.fn(async ({ collection, where }: any) => {
        const ids: Array<string | number> = where?.id?.in ?? []
        if (collection === 'variants') {
          return { docs: [{ id: 34, inventory: 25, product: 34 }], totalDocs: 1 }
        }
        if (collection === 'products') {
          return { docs: ids.map((id) => ({ id, inventory: 10 })), totalDocs: ids.length }
        }
        return { docs: [], totalDocs: 0 }
      }),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(54900))
    const data: TestData = { items: [{ lineType: 'standard', variant: 34, product: 34, quantity: 1 }] }
    await hook({ data, req: { payload } as never })
    expect(data.items).toHaveLength(1)
  })

  it('#241 cart shippingCountry selects the matching tax rate over the default', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      findByID: vi.fn(async () => null),
      find: vi.fn(async ({ collection }: any) => ({
        docs:
          collection === 'shipping-bands'
            ? [{ id: 1, label: 'Standard', minSubtotal: 0, price: 595, enabled: true }]
            : [
                { id: 2, rate: 20, isDefault: true, enabled: true },
                { id: 3, country: 'DE', rate: 19, enabled: true },
              ],
        totalDocs: 2,
      })),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(10_000))
    const data: TestData & Record<string, unknown> = {
      items: [{ lineType: 'standard' }],
      shippingCountry: 'DE',
    }
    await hook({ data, req: { payload } as never })
    // 10000 + 595 = 10595 charge; German 19% extracted: 10595*19/119 = 1692.
    expect(data.shippingTotal).toBe(595)
    expect(data.taxTotal).toBe(1_692)
    expect(data.total).toBe(10_595)
  })

  it('#242 an unknown shippingCountry falls back to the default tax rate', async () => {
    const { hooks } = await importFresh()
    const payload = {
      logger: { warn: vi.fn() },
      findByID: vi.fn(async () => null),
      find: vi.fn(async ({ collection }: any) => ({
        docs:
          collection === 'shipping-bands'
            ? [{ id: 1, label: 'Standard', minSubtotal: 0, price: 595, enabled: true }]
            : [
                { id: 2, rate: 20, isDefault: true, enabled: true },
                { id: 3, country: 'DE', rate: 19, enabled: true },
              ],
        totalDocs: 2,
      })),
    }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(10_000))
    const data: TestData & Record<string, unknown> = {
      items: [{ lineType: 'standard' }],
      shippingCountry: 'ZZ',
    }
    await hook({ data, req: { payload } as never })
    expect(data.taxTotal).toBe(1_766) // 10595*20/120
  })

  /**
   * Audit 2026-10-24 (backend round): capQuantitiesToStock used to issue one
   * findByID per line plus one per variant parent — up to 2N sequential
   * queries on every cart write. The batched version must stay O(1) finds.
   */
  it('#714 batches stock lookups — at most one find per collection for a multi-line cart', async () => {
    const { hooks } = await importFresh()
    const findByID = vi.fn()
    const find = vi.fn(async ({ collection, where }: any) => {
      if (collection === 'inventory-reservations') return { docs: [], totalDocs: 0 }
      const ids: Array<string | number> = where?.id?.in ?? []
      if (collection === 'variants') {
        return {
          docs: ids.map((id) => ({ id, inventory: 5, product: 100 + Number(id) })),
          totalDocs: ids.length,
        }
      }
      if (collection === 'products') {
        return { docs: ids.map((id) => ({ id, inventory: 7 })), totalDocs: ids.length }
      }
      return { docs: [], totalDocs: 0 }
    })
    const payload = { logger: { warn: vi.fn() }, findByID, find }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(0))
    const data: TestData = {
      items: [
        { lineType: 'standard', variant: 41, product: 141, quantity: 3 },
        { lineType: 'standard', variant: 42, product: 142, quantity: 10 },
        { lineType: 'standard', product: 51, quantity: 2 },
      ],
    }
    await hook({ data, req: { payload } as never })
    expect(findByID).not.toHaveBeenCalled()
    const stockFinds = find.mock.calls.filter(
      ([a]: any[]) => a.collection === 'variants' || a.collection === 'products',
    )
    expect(stockFinds.length).toBeLessThanOrEqual(3)
    // variant 42: 5 on hand − 0 held → capped to 5; other lines untouched.
    expect(data.items[0].quantity).toBe(3)
    expect(data.items[1].quantity).toBe(5)
    expect(data.items[2].quantity).toBe(2)
  })

  it('#715 a variant absent from the batched result drops its line (was the 404 path)', async () => {
    const { hooks } = await importFresh()
    const find = vi.fn(async ({ collection, where }: any) => {
      if (collection === 'inventory-reservations') return { docs: [], totalDocs: 0 }
      const ids: Array<string | number> = where?.id?.in ?? []
      if (collection === 'variants') {
        // Only variant 42 resolves — 41 was trashed with its product.
        return {
          docs: ids.filter((id) => Number(id) === 42).map((id) => ({ id, inventory: 5, product: 142 })),
          totalDocs: 1,
        }
      }
      if (collection === 'products') {
        return { docs: ids.map((id) => ({ id, inventory: 9 })), totalDocs: ids.length }
      }
      return { docs: [], totalDocs: 0 }
    })
    const payload = { logger: { warn: vi.fn() }, find }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(0))
    const data: TestData = {
      items: [
        { lineType: 'standard', variant: 41, product: 141, quantity: 1 },
        { lineType: 'standard', variant: 42, product: 142, quantity: 1 },
      ],
    }
    await hook({ data, req: { payload } as never })
    expect(data.items).toHaveLength(1)
    expect(data.items[0].variant).toBe(42)
  })

  it('#716 a transient batch failure keeps every line (never empties a cart)', async () => {
    const { hooks } = await importFresh()
    const find = vi.fn(async ({ collection }: any) => {
      if (collection === 'inventory-reservations') return { docs: [], totalDocs: 0 }
      throw Object.assign(new Error('connection reset'), { status: 500 })
    })
    const payload = { logger: { warn: vi.fn() }, find }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(0))
    const data: TestData = {
      items: [
        { lineType: 'standard', product: 34, quantity: 1 },
        { lineType: 'standard', product: 35, quantity: 1 },
      ],
    }
    await hook({ data, req: { payload } as never })
    expect(data.items).toHaveLength(2)
  })

  it('#717 pricing config is cached between cart writes and invalidated on demand', async () => {
    const { hooks } = await importFresh()
    const find = vi.fn(async ({ collection }: any) => ({
      docs:
        collection === 'shipping-bands'
          ? [{ id: 1, label: 'Standard', minSubtotal: 0, price: 595, enabled: true }]
          : collection === 'tax-rates'
            ? [{ id: 2, rate: 20, isDefault: true, enabled: true }]
            : [],
      totalDocs: 1,
    }))
    const payload = { logger: { warn: vi.fn() }, findByID: vi.fn(async () => null), find }
    const hook = hooks.wrapCartBeforeChange(makeDefaultHook(10_000))
    await hook({ data: { items: [{ lineType: 'standard' }] }, req: { payload } as never })
    await hook({ data: { items: [{ lineType: 'standard' }] }, req: { payload } as never })
    expect(find.mock.calls.filter(([a]: any[]) => a.collection === 'shipping-bands')).toHaveLength(1)
    hooks.invalidatePricingConfig()
    await hook({ data: { items: [{ lineType: 'standard' }] }, req: { payload } as never })
    expect(find.mock.calls.filter(([a]: any[]) => a.collection === 'shipping-bands')).toHaveLength(2)
  })

  it('#718 collectBuildIssues resolves lines concurrently, preserving item order', async () => {
    const { hooks, lib } = await importFresh()
    const started: string[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    lib.registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: async (line) => {
        started.push(String((line as { configuredBuild?: unknown }).configuredBuild))
        await gate
        if ((line as { configuredBuild?: unknown }).configuredBuild === 'bad') {
          throw new Error('Build bad: incompatible')
        }
        return { price: 1, subItems: [], fulfillmentUnits: 1 }
      },
    })
    const items: TestItem[] = [
      { lineType: 'configured-build', configuredBuild: 'bad' },
      { lineType: 'configured-build', configuredBuild: 'good' },
    ]
    const pending = hooks.collectBuildIssues(items, makeReq())
    await vi.waitFor(() => expect(started).toHaveLength(2))
    release()
    expect(await pending).toEqual(['Build bad: incompatible'])
  })

  it('extendItemsFields adds composite fields to items (top-level and tabs-nested)', async () => {
    const { hooks } = await importFresh()
    const fields = [
      { name: 'secret', type: 'text' },
      { name: 'items', type: 'array', fields: [{ name: 'product', type: 'relationship' }] },
      {
        name: 'layout',
        type: 'tabs',
        tabs: [
          {
            label: 'Tab',
            fields: [{ name: 'items', type: 'array', fields: [{ name: 'quantity', type: 'number' }] }],
          },
        ],
      },
    ] as never[]
    const out = hooks.extendItemsFields(fields) as {
      name: string
      fields?: { name: string; type: string; fields?: { name: string }[] }[]
      tabs?: { fields: { name: string; fields?: { name: string }[] }[] }[]
    }[]
    const topItems = out.find((f) => f.name === 'items')!
    expect(topItems.fields!.map((f) => f.name)).toEqual([
      'product',
      'lineType',
      'configuredBuild',
      'buildName',
      'packagingTier',
      'lineLabel',
      'subItems',
    ])
    const tabItems = out.find((f) => f.name === 'layout')!.tabs![0].fields.find((f) => f.name === 'items')!
    expect(tabItems.fields!.map((f) => f.name)).toEqual([
      'quantity',
      'lineType',
      'configuredBuild',
      'buildName',
      'packagingTier',
      'lineLabel',
      'subItems',
    ])
    // original fields are not mutated
    expect(fields[1]).toMatchObject({ name: 'items', fields: [{ name: 'product', type: 'relationship' }] })
  })
})

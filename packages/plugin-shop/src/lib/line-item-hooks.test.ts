import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CartBeforeChangeHook } from './line-item-hooks'

const importFresh = async () => {
  vi.resetModules()
  const hooks = await import('./line-item-hooks')
  const lib = await import('@buildmyrig/lib')
  return { hooks, lib }
}

type TestItem = { lineType?: string; configuredBuild?: string; quantity?: number; product?: string }
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
      'subItems',
    ])
    const tabItems = out.find((f) => f.name === 'layout')!.tabs![0].fields.find((f) => f.name === 'items')!
    expect(tabItems.fields!.map((f) => f.name)).toEqual([
      'quantity',
      'lineType',
      'configuredBuild',
      'buildName',
      'subItems',
    ])
    // original fields are not mutated
    expect(fields[1]).toMatchObject({ name: 'items', fields: [{ name: 'product', type: 'relationship' }] })
  })
})

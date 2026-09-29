import { describe, it, expect, beforeEach, vi } from 'vitest'

const importFresh = async () => {
  vi.resetModules()
  return await import('./line-items')
}

const makeType = (slug: string) => ({
  slug,
  label: slug,
  resolveLine: async () => ({ price: 0, subItems: [], fulfillmentUnits: 0 }),
})

describe('line-item registry (shop ↔ builder integration point)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('registers and retrieves a line type by slug', async () => {
    const { registerLineItemType, getLineItemType } = await importFresh()
    const type = makeType('configured-build')
    registerLineItemType(type)
    expect(getLineItemType('configured-build')).toBe(type)
  })

  it('returns null for unknown slugs (safe default)', async () => {
    const { getLineItemType } = await importFresh()
    expect(getLineItemType('mystery-box')).toBeNull()
  })

  it('lists all registered types', async () => {
    const { registerLineItemType, getLineItemTypes } = await importFresh()
    expect(getLineItemTypes()).toHaveLength(0)
    registerLineItemType(makeType('mystery-box'))
    registerLineItemType(makeType('gift-card'))
    expect(getLineItemTypes().map((t) => t.slug)).toEqual(['mystery-box', 'gift-card'])
  })
})

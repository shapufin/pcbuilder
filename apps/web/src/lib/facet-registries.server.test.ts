import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFind } = vi.hoisted(() => ({ mockFind: vi.fn() }))

vi.mock('@/lib/shop', () => ({
  getPayloadClient: vi.fn(async () => ({ find: mockFind })),
}))

import { getFacetRegistries, invalidateFacetRegistries } from './facet-registries.server'

describe('getFacetRegistries — audit 2026-10-24 (cross-request cache)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateFacetRegistries()
    mockFind.mockImplementation(async ({ collection }: { collection: string }) => ({
      docs: [{ id: 1, collection }],
    }))
  })

  it('serves repeat calls from cache — one find per collection, not per render', async () => {
    const first = await getFacetRegistries()
    const second = await getFacetRegistries()
    expect(first.attributeTypes).toHaveLength(1)
    expect(second.attributeTypes).toEqual(first.attributeTypes)
    const calls = mockFind.mock.calls.map((args) => (args[0] as { collection: string }).collection).sort()
    expect(calls).toEqual(['attribute-types', 'attribute-values', 'brands'])
  })

  it('refetches after invalidation', async () => {
    await getFacetRegistries()
    invalidateFacetRegistries()
    await getFacetRegistries()
    expect(mockFind.mock.calls.filter((args) => (args[0] as { collection: string }).collection === 'brands')).toHaveLength(2)
  })

  it('dedupes concurrent first fetches (inflight share)', async () => {
    const [a, b] = await Promise.all([getFacetRegistries(), getFacetRegistries()])
    expect(a).toBe(b)
    expect(mockFind).toHaveBeenCalledTimes(3)
  })
})

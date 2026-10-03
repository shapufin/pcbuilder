import { describe, it, expect } from 'vitest'
import type { Payload } from 'payload'
import {
  findIncompleteSlotReasons,
  findUnknownSlotRefs,
  newShareId,
  priceBuildFromIndex,
  resolveConfiguredBuildLine,
  slotsToSelections,
  type BuildSlot,
} from './builds'

const indexCollections = (overrides: Record<string, unknown[]> = {}): Record<string, unknown[]> => ({
  'component-categories': [
    { id: 4, slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 0 },
    { id: 5, slug: 'motherboard', name: 'Motherboard', required: true, maxSelectable: 1, sortOrder: 1 },
  ],
  components: [
    { id: 1, name: 'Ryzen 7 7800X3D', category: { id: 4 }, socket: 'AM5', productVariant: { id: 11, priceInEUR: 37900 } },
    { id: 2, name: 'ASUS ROG Strix B650E-F', category: { id: 5 }, socket: 'AM5', productVariant: { id: 12, priceInEUR: 24900 } },
    { id: 3, name: 'ASUS Prime Z790-P', category: { id: 5 }, socket: 'LGA1700', productVariant: { id: 13, priceInEUR: 19900 } },
  ],
  'compatibility-rules': [
    {
      id: 9,
      enabled: true,
      subjectType: 'component',
      subjectComponent: { id: 1 },
      targetType: 'category',
      targetCategory: { id: 5 },
      type: 'requires',
      operator: 'equals',
      field: 'socket',
      value: 'AM5',
      severity: 'error',
      bidirectional: false,
      message: '{componentA} needs an AM5 board, {componentB} is not',
    },
  ],
  'derived-power-rules': [],
  ...overrides,
})

const fakePayload = (buildDoc: unknown = null, collections = indexCollections()): Payload => {
  const updates: Record<string, unknown>[] = []
  return {
    find: async ({ collection }: { collection: string }) => ({ docs: collections[collection] ?? [] }),
    findByID: async ({ id }: { id: string | number }) =>
      id === 'build-1' ? buildDoc : null,
    update: async ({ id, data }: { id: string | number; data: Record<string, unknown> }) => {
      updates.push({ id, data })
      return { id, ...data }
    },
    __updates: updates,
  } as unknown as Payload & { __updates: Record<string, unknown>[] }
}

const validBuild = {
  id: 'build-1',
  name: 'Test build',
  slots: [
    { category: { id: 4 }, components: [{ id: 1 }] },
    { category: { id: 5 }, components: [{ id: 2 }] },
  ],
}

describe('builds helpers (Phase 2e)', () => {
  it('newShareId is unique and URL-safe', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newShareId()))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('slotsToSelections maps category → component ids', () => {
    const slots: BuildSlot[] = [
      { categoryId: '4', componentIds: ['1'] },
      { categoryId: '5', componentIds: ['2', '3'] },
    ]
    expect(slotsToSelections(slots)).toEqual({ 4: ['1'], 5: ['2', '3'] })
  })

  it('priceBuildFromIndex sums current variant prices of selected components', async () => {
    const payload = fakePayload()
    const { buildBuilderIndex } = await import('./builder-index')
    const index = await buildBuilderIndex(payload)
    expect(priceBuildFromIndex(index, ['1', '2'])).toBe(62800)
    expect(priceBuildFromIndex(index, ['1', '3'])).toBe(57800)
  })

  it('resolveConfiguredBuildLine resolves price + subItems for a valid build', async () => {
    const payload = fakePayload(validBuild)
    const line = await resolveConfiguredBuildLine({ configuredBuild: 'build-1', quantity: 1 }, payload)
    expect(line.price).toBe(62800)
    expect(line.fulfillmentUnits).toBe(2)
    expect(line.subItems).toEqual([
      { componentId: '1', quantity: 1 },
      { componentId: '2', quantity: 1 },
    ])
    const updates = (payload as unknown as { __updates: Record<string, unknown>[] }).__updates
    expect(updates).toHaveLength(1)
    expect(updates[0].data).toMatchObject({ priceSnapshot: 62800, status: 'addedToCart' })
  })

  it('resolveConfiguredBuildLine throws with reasons when the build is incompatible', async () => {
    const badBuild = {
      id: 'build-1',
      name: 'Bad build',
      slots: [
        { category: { id: 4 }, components: [{ id: 1 }] }, // AM5 CPU
        { category: { id: 5 }, components: [{ id: 3 }] }, // LGA1700 board
      ],
    }
    const payload = fakePayload(badBuild)
    await expect(
      resolveConfiguredBuildLine({ configuredBuild: 'build-1', quantity: 1 }, payload),
    ).rejects.toThrow(/AM5 board/)
    const updates = (payload as unknown as { __updates: Record<string, unknown>[] }).__updates
    expect(updates).toHaveLength(0) // no snapshot write on invalid build
  })

  it('resolveConfiguredBuildLine throws when the build does not exist', async () => {
    const payload = fakePayload(null)
    await expect(
      resolveConfiguredBuildLine({ configuredBuild: 'ghost', quantity: 1 }, payload),
    ).rejects.toThrow(/not found/i)
  })
})

describe('findUnknownSlotRefs (rejects phantom ids before they hit the DB)', () => {
  const makeIndex = async () => {
    const payload = fakePayload()
    const { buildBuilderIndex } = await import('./builder-index')
    return buildBuilderIndex(payload)
  }

  it('returns no reasons for a valid selection', async () => {
    const index = await makeIndex()
    const slots: BuildSlot[] = [
      { categoryId: '4', componentIds: ['1'] },
      { categoryId: '5', componentIds: ['2'] },
    ]
    expect(findUnknownSlotRefs(index, slots)).toEqual([])
  })

  it('flags an unknown category id (slug that resolved to nothing)', async () => {
    const index = await makeIndex()
    expect(findUnknownSlotRefs(index, [{ categoryId: '99', componentIds: ['1'] }])).toEqual([
      expect.stringMatching(/unknown category.*99/i),
    ])
  })

  it('flags an unknown component id', async () => {
    const index = await makeIndex()
    expect(
      findUnknownSlotRefs(index, [{ categoryId: '5', componentIds: ['2', '999'] }]),
    ).toEqual([expect.stringMatching(/unknown component.*999/i)])
  })

  it('flags a component filed under a different category', async () => {
    const index = await makeIndex()
    // component 1 is a CPU (category 4) but slotted into the motherboard category
    expect(
      findUnknownSlotRefs(index, [{ categoryId: '5', componentIds: ['1'] }]),
    ).toEqual([expect.stringMatching(/category/i)])
  })

  it('collects every reason, not just the first', async () => {
    const index = await makeIndex()
    const reasons = findUnknownSlotRefs(index, [
      { categoryId: '99', componentIds: ['1'] },
      { categoryId: '5', componentIds: ['999'] },
    ])
    expect(reasons).toHaveLength(2)
  })
})

describe('findIncompleteSlotReasons — audit pass 3 (required/maxSelectable server-side)', () => {
  const makeIndex = async () => {
    const payload = fakePayload()
    const { buildBuilderIndex } = await import('./builder-index')
    return buildBuilderIndex(payload)
  }

  it('#190 rejects a build missing a required category', async () => {
    const index = await makeIndex()
    // cpu + motherboard are both required; only cpu filled
    const reasons = findIncompleteSlotReasons(index, [
      { categoryId: '4', componentIds: ['1'] },
    ])
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toMatch(/motherboard/i)
    expect(reasons[0]).toMatch(/required/i)
  })

  it('#191 rejects a slot that exceeds maxSelectable', async () => {
    const index = await makeIndex()
    const reasons = findIncompleteSlotReasons(index, [
      { categoryId: '4', componentIds: ['1'] },
      { categoryId: '5', componentIds: ['2', '3'] }, // maxSelectable 1
    ])
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toMatch(/max/i)
  })

  it('#192 optional categories and in-limit multi-selects pass', async () => {
    const payload = fakePayload(null, indexCollections({
      'component-categories': [
        { id: 4, slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 0 },
        { id: 6, slug: 'fans', name: 'Extra fans', required: false, maxSelectable: 3, sortOrder: 1 },
      ],
      components: [
        { id: 1, name: 'Ryzen 7', category: { id: 4 }, productVariant: { id: 11, priceInEUR: 37900 } },
        { id: 7, name: 'Fan A', category: { id: 6 }, productVariant: { id: 17, priceInEUR: 2000 } },
        { id: 8, name: 'Fan B', category: { id: 6 }, productVariant: { id: 18, priceInEUR: 2500 } },
      ],
    }))
    const { buildBuilderIndex } = await import('./builder-index')
    const index = await buildBuilderIndex(payload)
    expect(
      findIncompleteSlotReasons(index, [
        { categoryId: '4', componentIds: ['1'] },
        { categoryId: '6', componentIds: ['7', '8'] },
      ]),
    ).toEqual([])
    // and leaving the optional slot out entirely is fine
    expect(findIncompleteSlotReasons(index, [{ categoryId: '4', componentIds: ['1'] }])).toEqual([])
  })

  it('#193 resolveConfiguredBuildLine refuses an incomplete saved build', async () => {
    const incomplete = {
      id: 'build-1',
      name: 'Half build',
      slots: [{ category: { id: 4 }, components: [{ id: 1 }] }], // motherboard missing
    }
    const payload = fakePayload(incomplete)
    await expect(
      resolveConfiguredBuildLine({ configuredBuild: 'build-1', quantity: 1 }, payload),
    ).rejects.toThrow(/required|incomplete/i)
  })
})

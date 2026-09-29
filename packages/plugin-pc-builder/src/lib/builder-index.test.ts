import { describe, it, expect } from 'vitest'
import type { Payload } from 'payload'
import { buildBuilderIndex, setPowerDefaults } from './builder-index.ts'

const componentDoc = {
  id: 1,
  name: 'Ryzen 7 7800X3D',
  category: { id: 4 },
  brand: { id: 2, name: 'AMD' },
  images: [{ id: 9, url: '/media/cpu-7800x3d.jpg' }],
  description: '8-core gaming CPU',
  socket: 'AM5',
  ramType: 'DDR5',
  tdpWatts: 120,
  specsJson: {
    cores: 8,
    baseClockGhz: 4.7,
    features: ['PBO', 'Curve Optimizer'],
    nested: { a: 1 },
    note: null,
  },
  productVariant: { id: 11, priceInEUR: 34900 },
}

const fakePayload = (overrides: Record<string, unknown[]> = {}): Payload => {
  const collections: Record<string, unknown[]> = {
    'component-categories': [
      {
        id: 4,
        slug: 'cpu',
        name: 'CPU',
        required: true,
        maxSelectable: 1,
        sortOrder: 0,
        helperText: 'The brain of your rig',
        icon: 'cpu',
      },
    ],
    components: [componentDoc],
    'compatibility-rules': [],
    'derived-power-rules': [],
    ...overrides,
  }
  return {
    find: async ({ collection }: { collection: string }) => ({ docs: collections[collection] ?? [] }),
  } as unknown as Payload
}

describe('buildBuilderIndex → display block (Phase 2d)', () => {
  it('carries helperText + icon on categories for the step UI', async () => {
    const index = await buildBuilderIndex(fakePayload())
    expect(index.categories[0]).toMatchObject({ helperText: 'The brain of your rig', icon: 'cpu' })
  })
  it('maps name, brand, image, description onto ComponentSpecEntry.display', async () => {
    const index = await buildBuilderIndex(fakePayload())
    const cpu = index.components.find((c) => c.id === '1')
    expect(cpu?.display).toMatchObject({
      name: 'Ryzen 7 7800X3D',
      brand: 'AMD',
      image: '/media/cpu-7800x3d.jpg',
      description: '8-core gaming CPU',
    })
  })

  it('cosmetic specsJson keeps primitives/arrays only, drops nested objects', async () => {
    const index = await buildBuilderIndex(fakePayload())
    const cpu = index.components.find((c) => c.id === '1')
    expect(cpu?.display?.specs).toEqual({
      cores: 8,
      baseClockGhz: 4.7,
      features: ['PBO', 'Curve Optimizer'],
    })
    expect(cpu?.specs.socket).toBe('AM5')
    expect(cpu?.priceCents).toBe(34900)
  })

  it('missing brand/image/description yields display without those keys', async () => {
    const bare = {
      id: 2,
      name: 'Case Fan',
      category: { id: 5 },
      productVariant: { id: 12, priceInEUR: 900 },
    }
    const index = await buildBuilderIndex(fakePayload({ components: [bare] }))
    const fan = index.components.find((c) => c.id === '2')
    expect(fan?.display?.name).toBe('Case Fan')
    expect(fan?.display?.brand).toBeUndefined()
    expect(fan?.display?.image).toBeUndefined()
  })
})

describe('buildBuilderIndex → derived power config (entry 10 wiring)', () => {
  it('maps severity + populated targetCategory (id + slug) from the rule doc', async () => {
    const payload = fakePayload({
      'derived-power-rules': [
        {
          id: 1,
          overheadMultiplier: 1.4,
          baseWatts: 90,
          severity: 'error',
          targetCategory: { id: 4, slug: 'psu' },
        },
      ],
    })
    const index = await buildBuilderIndex(payload)
    expect(index.power).toEqual({
      overheadMultiplier: 1.4,
      baseWatts: 90,
      severity: 'error',
      targetCategoryId: '4',
      targetCategorySlug: 'psu',
    })
  })

  it('plugin powerDefaults fill gaps; rule-doc values take precedence', async () => {
    try {
      setPowerDefaults({ overheadMultiplier: 1.5, baseWatts: 80 })
      const withDefaults = await buildBuilderIndex(fakePayload())
      expect(withDefaults.power).toEqual({ overheadMultiplier: 1.5, baseWatts: 80 })

      const withRule = await buildBuilderIndex(
        fakePayload({
          'derived-power-rules': [{ id: 1, overheadMultiplier: 1.4, baseWatts: 90 }],
        }),
      )
      expect(withRule.power.overheadMultiplier).toBe(1.4)
      expect(withRule.power.baseWatts).toBe(90)
    } finally {
      setPowerDefaults()
    }
  })

  it('no rule doc and no plugin defaults → engine defaults 1.3 / 100, no severity/target keys', async () => {
    try {
      setPowerDefaults()
      const index = await buildBuilderIndex(fakePayload())
      expect(index.power).toEqual({ overheadMultiplier: 1.3, baseWatts: 100 })
    } finally {
      setPowerDefaults()
    }
  })
})

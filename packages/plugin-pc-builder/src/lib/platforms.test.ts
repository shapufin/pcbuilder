import { describe, it, expect } from 'vitest'
import type { BuilderIndex, ComponentSpecEntry } from '@buildmyrig/lib'
import {
  PATH_BOUND_SLUGS,
  platformsForComponent,
  builderPaths,
  makePathVisible,
  pathVisible,
  pathIsOffered,
  pathBoundCategoryIds,
  inferPath,
} from './platforms.ts'

const CATS: BuilderIndex['categories'] = [
  { id: 'cpu', slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 1 },
  { id: 'mobo', slug: 'motherboard', name: 'Motherboard', required: true, maxSelectable: 1, sortOrder: 2 },
  { id: 'ram', slug: 'ram', name: 'Memory', required: true, maxSelectable: 4, sortOrder: 3 },
  { id: 'gpu', slug: 'gpu', name: 'Graphics Card', required: true, maxSelectable: 1, sortOrder: 4 },
  { id: 'cooling', slug: 'cooling', name: 'CPU Cooling', required: true, maxSelectable: 1, sortOrder: 8 },
  { id: 'psu', slug: 'psu', name: 'Power Supply', required: true, maxSelectable: 1, sortOrder: 6 },
]

const comp = (id: string, categoryId: string, specs: ComponentSpecEntry['specs']): ComponentSpecEntry => ({
  id,
  categoryId,
  specs,
  priceCents: 100,
})

const mkIndex = (components: ComponentSpecEntry[]): BuilderIndex => ({
  components,
  rules: [],
  categories: CATS,
  power: { overheadMultiplier: 1.3, baseWatts: 100 },
  rulesVersion: 't',
})

describe('platformsForComponent', () => {
  it('maps sockets to platforms for cpu/motherboard', () => {
    expect(platformsForComponent('cpu', { socket: 'AM5' })).toEqual(['amd'])
    expect(platformsForComponent('cpu', { socket: 'AM4' })).toEqual(['amd'])
    expect(platformsForComponent('motherboard', { socket: 'LGA1700' })).toEqual(['intel'])
    expect(platformsForComponent('motherboard', { socket: 'LGA1851' })).toEqual(['intel'])
    expect(platformsForComponent('motherboard', { socket: 'LGA1200' })).toEqual(['intel'])
  })

  it('supports custom socket platform mappings', () => {
    expect(platformsForComponent('cpu', { socket: 'FUTURE_SOCKET' as never }, { FUTURE_SOCKET: 'amd' })).toEqual(['amd'])
  })

  it('cooling gets the union of its socket support (multi-platform coolers)', () => {
    expect(platformsForComponent('cooling', { coolerSocketSupport: ['AM5', 'LGA1700'] })).toEqual([
      'amd',
      'intel',
    ])
    expect(platformsForComponent('cooling', { coolerSocketSupport: ['LGA1700'] })).toEqual(['intel'])
  })

  it('ram has no platform tag (mobo-bound, not socket-bound)', () => {
    expect(platformsForComponent('ram', { ramType: 'DDR5' })).toEqual([])
  })

  it('platform-agnostic categories return []', () => {
    for (const slug of ['gpu', 'psu', 'case', 'storage', 'os', 'case-fan']) {
      expect(platformsForComponent(slug, {})).toEqual([])
    }
  })

  it('unknown socket → unconstrained ([]) rather than guessed', () => {
    expect(platformsForComponent('cpu', { socket: 'UNKNOWN_SOCKET' as never })).toEqual([])
    expect(platformsForComponent('cpu', {})).toEqual([])
  })
})

describe('builderPaths', () => {
  it('surfaces only platforms whose sockets exist in data', () => {
    const idx = mkIndex([comp('c1', 'cpu', { socket: 'AM5' })])
    const paths = builderPaths(idx)
    expect(paths.map((p) => p.id)).toEqual(['amd'])
    expect(paths[0].sockets).toEqual(['AM5'])
  })

  it('both paths when both socket families exist', () => {
    const idx = mkIndex([
      comp('c1', 'cpu', { socket: 'AM5' }),
      comp('c2', 'cpu', { socket: 'LGA1700' }),
      comp('c3', 'cpu', { socket: 'LGA1851' }),
    ])
    const paths = builderPaths(idx)
    expect(paths.map((p) => p.id).sort()).toEqual(['amd', 'intel'])
    expect(paths.find((p) => p.id === 'intel')?.sockets.sort()).toEqual(['LGA1700', 'LGA1851'])
  })
})

describe('pathVisible', () => {
  const components = [
    comp('cpu-amd', 'cpu', { socket: 'AM5' }),
    comp('cpu-intel', 'cpu', { socket: 'LGA1700' }),
    comp('mobo-amd', 'mobo', { socket: 'AM5', ramType: 'DDR5' }),
    comp('mobo-intel', 'mobo', { socket: 'LGA1700', ramType: 'DDR5' }),
    comp('cool-both', 'cooling', { coolerSocketSupport: ['AM5', 'LGA1700'] }),
    comp('cool-intel', 'cooling', { coolerSocketSupport: ['LGA1700'] }),
    comp('ram-ddr5', 'ram', { ramType: 'DDR5' }),
    comp('ram-ddr4', 'ram', { ramType: 'DDR4' }),
    comp('gpu-any', 'gpu', { gpuLengthMm: 240 }),
    comp('psu-any', 'psu', { psuWatts: 650 }),
  ]
  // platforms populated as the index-build would
  for (const c of components) {
    const slug = CATS.find((x) => x.id === c.categoryId)!.slug
    const plats = platformsForComponent(slug, c.specs)
    if (plats.length) (c as { platforms?: string[] }).platforms = plats
  }
  const idx = mkIndex(components)

  it('null path → everything visible', () => {
    for (const c of components) expect(pathVisible(c, idx, null)).toBe(true)
  })

  it('amd path: amd-only cpu/mobo visible, intel hidden, cross-socket cooler kept', () => {
    const v = (id: string) => pathVisible(components.find((c) => c.id === id)!, idx, 'amd')
    expect(v('cpu-amd')).toBe(true)
    expect(v('cpu-intel')).toBe(false)
    expect(v('mobo-amd')).toBe(true)
    expect(v('mobo-intel')).toBe(false)
    expect(v('cool-both')).toBe(true)
    expect(v('cool-intel')).toBe(false)
    expect(v('gpu-any')).toBe(true)
    expect(v('psu-any')).toBe(true)
  })

  it('ram is filtered by the ramTypes of in-path mobos, not a platform tag', () => {
    // All mobos here are DDR5 → DDR4 kit hidden on either path
    expect(pathVisible(components.find((c) => c.id === 'ram-ddr5')!, idx, 'amd')).toBe(true)
    expect(pathVisible(components.find((c) => c.id === 'ram-ddr4')!, idx, 'amd')).toBe(false)
    // A DDR4 in-path mobo makes the kit visible again
    const idx2 = mkIndex([...components, comp('mobo-amd-ddr4', 'mobo', { socket: 'AM5', ramType: 'DDR4' })])
    const m = idx2.components.find((c) => c.id === 'mobo-amd-ddr4')!
    ;(m as { platforms?: string[] }).platforms = platformsForComponent('motherboard', m.specs)
    expect(pathVisible(components.find((c) => c.id === 'ram-ddr4')!, idx2, 'amd')).toBe(true)
  })

  it('no in-path mobos → all ram stays visible (nothing to bind to yet)', () => {
    const idxNoMobo = mkIndex(components.filter((c) => c.categoryId !== 'mobo'))
    expect(pathVisible(components.find((c) => c.id === 'ram-ddr4')!, idxNoMobo, 'amd')).toBe(true)
  })
})

describe('pathIsOffered / makePathVisible (review M1/L5)', () => {
  it('#451 a persisted path the index no longer offers is not servable', () => {
    const amdOnly = { platforms: [{ id: 'amd', label: 'AMD', sockets: ['AM5'] }] }
    const none = mkIndex([])
    expect(pathIsOffered('amd', amdOnly)).toBe(true)
    expect(pathIsOffered('intel', amdOnly)).toBe(false)
    // Zero platforms in data → no path is servable (drafts must clear).
    expect(pathIsOffered('amd', none)).toBe(false)
    expect(pathIsOffered(null, amdOnly)).toBe(false)
  })

  it('#452 makePathVisible matches pathVisible row-for-row, paths and null', () => {
    const components = [
      comp('cpu-amd', 'cpu', { socket: 'AM5' }),
      comp('cpu-intel', 'cpu', { socket: 'LGA1700' }),
      comp('mobo-amd', 'mobo', { socket: 'AM5', ramType: 'DDR5' }),
      comp('ram-ddr5', 'ram', { ramType: 'DDR5' }),
      comp('ram-ddr4', 'ram', { ramType: 'DDR4' }),
    ]
    for (const c of components) {
      const slug = CATS.find((x) => x.id === c.categoryId)!.slug
      const plats = platformsForComponent(slug, c.specs)
      if (plats.length) (c as { platforms?: string[] }).platforms = plats
    }
    const idx = mkIndex(components)
    for (const path of ['amd', 'intel', null] as const) {
      const filter = makePathVisible(idx, path)
      for (const c of components) {
        expect(filter(c)).toBe(pathVisible(c, idx, path))
      }
    }
  })
})

describe('pathBoundCategoryIds / inferPath', () => {
  it('resolves bound slots to category ids', () => {
    expect(pathBoundCategoryIds(CATS).sort()).toEqual(['cooling', 'cpu', 'mobo', 'ram'])
    expect(PATH_BOUND_SLUGS).toEqual(['cpu', 'motherboard', 'ram', 'cooling'])
  })

  it('infers path from a selected cpu or mobo socket', () => {
    const components = [comp('c1', 'cpu', { socket: 'AM5' }), comp('m1', 'mobo', { socket: 'LGA1700' })]
    for (const c of components) {
      const slug = CATS.find((x) => x.id === c.categoryId)!.slug
      const plats = platformsForComponent(slug, c.specs)
      if (plats.length) (c as { platforms?: string[] }).platforms = plats
    }
    const idx = mkIndex(components)
    expect(inferPath({ cpu: ['c1'] }, idx)).toBe('amd')
    expect(inferPath({ motherboard: ['m1'] }, idx)).toBe('intel')
    expect(inferPath({ ram: ['x'] }, idx)).toBeNull()
    expect(inferPath({}, idx)).toBeNull()
  })
})

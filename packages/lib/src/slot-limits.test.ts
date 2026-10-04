import { describe, expect, it } from 'vitest'
import type { BuilderIndex } from './rule-engine'
import { DEFAULT_RGB_ACCENT, RGB_PRESETS } from './rgb-presets'
import { resolveSlotLimits, resolvedMax, SLOT_LIMIT_RULES } from './slot-limits'

/**
 * Entry 50 (P0): spec-driven slot caps — a selected motherboard's ramSlots /
 * m2Slots caps how many RAM / storage components a design may let the user
 * install. Selections are keyed by category ID; the rules table speaks slugs.
 */

const baseIndex = (): BuilderIndex => ({
  components: [
    { id: '10', categoryId: '1', specs: { ramSlots: 4, m2Slots: 4 }, priceCents: 100, display: { name: 'ATX Board' } },
    { id: '11', categoryId: '1', specs: { ramSlots: 2, m2Slots: 2 }, priceCents: 100, display: { name: 'ITX Board' } },
    { id: '12', categoryId: '1', specs: {}, priceCents: 100, display: { name: 'NoSpec Board' } },
    { id: '20', categoryId: '2', specs: {}, priceCents: 50, display: { name: 'DIMM' } },
    { id: '30', categoryId: '3', specs: {}, priceCents: 50, display: { name: 'SSD' } },
  ],
  categories: [
    { id: '1', slug: 'motherboard', name: 'Motherboard', required: true, maxSelectable: 1, sortOrder: 0 },
    { id: '2', slug: 'ram', name: 'Memory', required: true, maxSelectable: 4, sortOrder: 1 },
    { id: '3', slug: 'storage', name: 'Storage', required: true, maxSelectable: 4, sortOrder: 2 },
  ],
  rules: [],
  power: { overheadMultiplier: 1.3, baseWatts: 100 },
  rulesVersion: 'test',
})

describe('resolveSlotLimits — entry 50', () => {
  it('#294 no host selected → every category keeps its maxSelectable', () => {
    const limits = resolveSlotLimits(baseIndex(), {})
    expect(limits['2']).toEqual({ max: 4 })
    expect(limits['3']).toEqual({ max: 4 })
    expect(limits['1']).toEqual({ max: 1 })
  })

  it('#295 ITX board (ramSlots 2) caps the ram slot and explains why', () => {
    const limits = resolveSlotLimits(baseIndex(), { '1': ['11'] })
    expect(limits['2'].max).toBe(2)
    expect(limits['2'].cappedBy).toEqual({
      componentId: '11',
      componentName: 'ITX Board',
      field: 'ramSlots',
    })
  })

  it('#296 host spec ≥ maxSelectable → category policy still binds, no cappedBy', () => {
    const limits = resolveSlotLimits(baseIndex(), { '1': ['10'] })
    expect(limits['2']).toEqual({ max: 4 })
  })

  it('#297 host selected but lacks the spec → falls back to maxSelectable', () => {
    const limits = resolveSlotLimits(baseIndex(), { '1': ['12'] })
    expect(limits['2']).toEqual({ max: 4 })
    expect(limits['3']).toEqual({ max: 4 })
  })

  it('#298 m2Slots caps the storage slot independently of ram', () => {
    const limits = resolveSlotLimits(baseIndex(), { '1': ['11'] })
    expect(limits['3']).toEqual({
      max: 2,
      cappedBy: { componentId: '11', componentName: 'ITX Board', field: 'm2Slots' },
    })
  })

  it('#299 selections referencing unknown categories/components are ignored', () => {
    const limits = resolveSlotLimits(baseIndex(), { '99': ['x'], '1': ['ghost'] })
    expect(limits['2']).toEqual({ max: 4 })
  })

  it('#300 SLOT_LIMIT_RULES is the data-driven table (ram + storage ← motherboard)', () => {
    expect(SLOT_LIMIT_RULES).toEqual([
      { slotSlug: 'ram', hostSlug: 'motherboard', field: 'ramSlots' },
      { slotSlug: 'storage', hostSlug: 'motherboard', field: 'm2Slots' },
    ])
  })

  it('#301 multiple host picks → the most restrictive one wins (entry-55 review)', () => {
    const limits = resolveSlotLimits(baseIndex(), { '1': ['10', '11'] })
    expect(limits['2'].max).toBe(2)
    expect(limits['2'].cappedBy?.componentId).toBe('11')
    // pick order must not matter — lenient first, strict second
    const flipped = resolveSlotLimits(baseIndex(), { '1': ['11', '10'] })
    expect(flipped['2'].max).toBe(2)
  })

  it('#314 non-integer/negative host specs are ignored (no fractional caps)', () => {
    const index = baseIndex()
    index.components[1].specs = { ramSlots: 1.5, m2Slots: -2 }
    const limits = resolveSlotLimits(index, { '1': ['11'] })
    expect(limits['2']).toEqual({ max: 4 })
    expect(limits['3']).toEqual({ max: 4 })
  })

  it('#366 zero is a real cap — a 0-slot board (soldered RAM) blocks the slot', () => {
    const index = baseIndex()
    index.components[1].specs = { ramSlots: 0, m2Slots: 0 }
    const limits = resolveSlotLimits(index, { '1': ['11'] })
    expect(limits['2'].max).toBe(0)
    expect(limits['2'].cappedBy?.componentId).toBe('11')
    expect(limits['3'].max).toBe(0)
  })

  it('#367 resolvedMax collapses limits ?? maxSelectable ?? 1', () => {
    expect(resolvedMax({ '2': { max: 2 } }, { id: '2', maxSelectable: 4 })).toBe(2)
    expect(resolvedMax({ '2': { max: 2 } }, { id: '3', maxSelectable: 4 })).toBe(4)
    expect(resolvedMax(undefined, { id: '2' })).toBe(1)
  })
})

describe('rgb-presets — entry 50 (hex values live in packages/lib, not apps/web)', () => {
  const HEX6 = /^#[0-9a-fA-F]{6}$/

  it('#302 DEFAULT_RGB_ACCENT and every preset are valid #RRGGBB', () => {
    expect(RGB_PRESETS.length).toBeGreaterThan(1)
    expect(DEFAULT_RGB_ACCENT).toMatch(HEX6)
    for (const p of RGB_PRESETS) {
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.hex).toMatch(HEX6)
    }
  })
})

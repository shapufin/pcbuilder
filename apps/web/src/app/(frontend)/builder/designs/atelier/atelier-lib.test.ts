import { describe, expect, it } from 'vitest'
import {
  ATMOSPHERES,
  BLUEPRINT_LAYERS,
  PERSPECTIVES,
  atmosphereColor,
  atmosphereOpacity,
  powerReserve,
  slotIndex,
  slotLabel,
} from './atelier-lib.ts'

/**
 * Entry 131 — Atelier presentation vocabulary. The power math is the part
 * that can be wrong in a way users notice (a 120% load bar reading "ok"),
 * so it is pinned here.
 */
describe('atelier helpers (entry 131)', () => {
  it('#689 slot numbering is 1-based and zero-padded', () => {
    expect(slotIndex(1)).toBe('01')
    expect(slotIndex(9)).toBe('09')
    expect(slotIndex(10)).toBe('10')
    expect(slotIndex(0)).toBe('01')
    expect(slotIndex(-3)).toBe('01')
  })

  it('#690 known slugs get the editorial label; unknown slugs fall back', () => {
    expect(slotLabel('cpu', 'CPU')).toBe('Central Processor')
    expect(slotLabel('gpu', 'GPU')).toBe('Graphics Processor')
    expect(slotLabel('admin-custom', 'Admin custom')).toBe('Admin custom')
  })

  it('#691 every atmosphere and perspective preset is unique and labelled', () => {
    const atmo = ATMOSPHERES.map((a) => a.id)
    expect(new Set(atmo).size).toBe(atmo.length)
    const persp = PERSPECTIVES.map((p) => p.id)
    expect(new Set(persp).size).toBe(persp.length)
    expect(BLUEPRINT_LAYERS).toHaveLength(5)
    for (const a of ATMOSPHERES) expect(atmosphereColor(a.id)).toContain('var(--color-')
    for (const a of ATMOSPHERES) expect(atmosphereOpacity(a.id)).toBeGreaterThan(0)
  })

  it('#692 power reserve: no PSU → neutral, no numbers', () => {
    expect(powerReserve(335, null)).toEqual({ loadPct: null, reserveWatts: null, tone: 'neutral' })
    expect(powerReserve(335, 0)).toEqual({ loadPct: null, reserveWatts: null, tone: 'neutral' })
  })

  it('#693 power reserve: load, headroom and tone follow the rating', () => {
    expect(powerReserve(335, 850)).toEqual({ loadPct: 39, reserveWatts: 515, tone: 'ok' })
    expect(powerReserve(800, 850)).toEqual({ loadPct: 94, reserveWatts: 50, tone: 'warn' })
    expect(powerReserve(900, 850)).toEqual({ loadPct: 100, reserveWatts: -50, tone: 'danger' })
  })
})

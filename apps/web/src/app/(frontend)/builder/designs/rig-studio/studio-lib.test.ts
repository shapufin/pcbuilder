import { describe, expect, it } from 'vitest'
import { Cpu, Package } from 'lucide-react'
import type { BuilderIndex, ComponentSpecEntry } from '@buildmyrig/lib'
import {
  FALLBACK_ICON,
  GPU_FIT_TIGHT_MM,
  ICON_BY_SLUG,
  ZONE_BY_SLUG,
  categoryForZone,
  gpuFit,
  heatmapWeight,
  highlightFor,
  iconForCategory,
  numSpecOf,
  picksForZone,
  priceCentsOf,
  psuMargin,
  psuRatedWatts,
  rgbLinkedCount,
  slotCode,
  textSpecOf,
  wattsOf,
  zoneForCategory,
  zoneWatts,
} from './studio-lib'

/**
 * rig-studio P3a — studio-lib is the only place where the design derives data
 * from categories/entries: slotCode (plan §6.2), zone map (§6.3), icons, watts/price.
 * Pure: no React, no store.
 */

type Category = BuilderIndex['categories'][number]

const cat = (slug: string, name = slug.toUpperCase()): Category => ({
  id: `cat-${slug}`,
  slug,
  name,
  required: true,
  maxSelectable: 1,
  sortOrder: 1,
})

const entry = (
  specs: ComponentSpecEntry['specs'] = {},
  display?: ComponentSpecEntry['display'],
): ComponentSpecEntry => ({
  id: 'e1',
  categoryId: 'cat-x',
  specs,
  priceCents: 129900,
  display,
})

describe('zoneForCategory', () => {
  it('#332 every mapped slug resolves to its blueprint zone (§6.3)', () => {
    const expected: Record<string, string> = {
      gpu: 'gpu',
      cpu: 'cpu',
      cooling: 'aio',
      motherboard: 'mobo',
      ram: 'ram',
      storage: 'storage',
      case: 'case',
      psu: 'psu',
    }
    for (const [slug, zone] of Object.entries(expected)) {
      expect(zoneForCategory(slug), slug).toBe(zone)
    }
    expect(Object.keys(ZONE_BY_SLUG).sort()).toEqual(Object.keys(expected).sort())
  })

  it('#333 slug without a zone → undefined (degrade contract: bay+matrix cover it)', () => {
    expect(zoneForCategory('os')).toBeUndefined()
    expect(zoneForCategory('case-fan')).toBeUndefined()
    expect(zoneForCategory('custom-widget')).toBeUndefined()
  })
})

describe('slotCode / highlightFor', () => {
  it('#334 per-slug highlight: rule-critical spec becomes the code', () => {
    expect(slotCode(cat('gpu'), entry({ pcieVersion: '5.0' }))).toBe('[GPU-01] 5.0')
    expect(slotCode(cat('cpu'), entry({ socket: 'AM5' }))).toBe('[CPU-01] AM5')
    expect(slotCode(cat('storage'), entry({ storageInterface: 'NVMe' }))).toBe('[STORAGE-01] NVMe')
    expect(slotCode(cat('psu'), entry({ psuWatts: 850 }))).toBe('[PSU-01] 850W')
    expect(slotCode(cat('cooling'), entry({ radSizeMm: 360 }))).toBe('[COOLING-01] 360mm')
    expect(slotCode(cat('motherboard'), entry({ moboFormFactor: 'ATX' }))).toBe('[MOTHERBOARD-01] ATX')
    expect(slotCode(cat('case'), entry({ caseSupportedFormFactors: ['ATX', 'mATX'] }))).toBe('[CASE-01] ATX/mATX')
  })

  it('#335 ram combines ramType + ramSpeedMhz', () => {
    expect(slotCode(cat('ram'), entry({ ramType: 'DDR5', ramSpeedMhz: 6000 }))).toBe('[RAM-01] DDR5 6000MHz')
    expect(slotCode(cat('ram'), entry({ ramType: 'DDR5' }))).toBe('[RAM-01] DDR5')
    expect(slotCode(cat('ram'), entry({ ramSpeedMhz: 5200 }))).toBe('[RAM-01] 5200MHz')
  })

  it('#336 missing spec → falls back to the category name', () => {
    expect(slotCode(cat('gpu', 'Graphics Card'), entry({}))).toBe('[GPU-01] Graphics Card')
    expect(slotCode(cat('psu', 'Power Supply'), entry({ psuWatts: undefined }))).toBe('[PSU-01] Power Supply')
    // runtime-malformed spec (empty string) — `as never` at the typed boundary
    expect(slotCode(cat('ram'), entry({ ramType: '' as never }))).toBe('[RAM-01] RAM')
    expect(slotCode(cat('case'), entry({ caseSupportedFormFactors: [] }))).toBe('[CASE-01] CASE')
  })

  it('#337 unmapped slug + absent entry → category name', () => {
    expect(slotCode(cat('os', 'Operating System'), entry({ osEdition: 'Pro' }))).toBe('[OS-01] Operating System')
    expect(slotCode(cat('case-fan'), undefined)).toBe('[CASE-FAN-01] CASE-FAN')
  })

  it('#338 multi-slot: slotIndex composes the code number', () => {
    const ram = cat('ram')
    const stick = entry({ ramType: 'DDR5', ramSpeedMhz: 6000 })
    expect(slotCode(ram, stick, 1)).toBe('[RAM-01] DDR5 6000MHz')
    expect(slotCode(ram, stick, 2)).toBe('[RAM-02] DDR5 6000MHz')
    expect(slotCode(ram, stick, 12)).toBe('[RAM-12] DDR5 6000MHz')
  })

  it('#339 highlight can read the same field from display.specs', () => {
    const e = entry({}, { name: 'GPU', specs: { pcieVersion: '4.0' } })
    expect(highlightFor(cat('gpu'), e)).toBe('4.0')
    // specs wins over display.specs for the same key
    const both = entry({ pcieVersion: '5.0' }, { name: 'GPU', specs: { pcieVersion: '4.0' } })
    expect(highlightFor(cat('gpu'), both)).toBe('5.0')
  })
})

describe('iconForCategory', () => {
  it('#340 mapped slug → its lucide icon; unknown → fallback', () => {
    expect(iconForCategory('cpu')).toBe(Cpu)
    expect(iconForCategory('gpu')).toBe(ICON_BY_SLUG.gpu)
    expect(iconForCategory('nope')).toBe(FALLBACK_ICON)
    expect(FALLBACK_ICON).toBe(Package)
  })
})

describe('wattsOf / priceCentsOf', () => {
  it('#341 tdpWatts and priceCents derived with fallback to 0', () => {
    expect(wattsOf(entry({ tdpWatts: 125 }))).toBe(125)
    expect(wattsOf(entry({}))).toBe(0)
    expect(wattsOf(undefined)).toBe(0)
    expect(priceCentsOf(entry())).toBe(129900)
    expect(priceCentsOf(undefined)).toBe(0)
  })
})

// ---------- P3b fixtures ----------

const indexOf = (
  categories: Category[],
  components: ComponentSpecEntry[],
): BuilderIndex => ({
  components,
  rules: [],
  categories,
  power: { overheadMultiplier: 1.3, baseWatts: 100 },
  rulesVersion: 'test',
})

const named = (
  id: string,
  categoryId: string,
  specs: ComponentSpecEntry['specs'] = {},
  display?: ComponentSpecEntry['display'],
): ComponentSpecEntry => ({ id, categoryId, specs, priceCents: 100, display })

describe('categoryForZone / picksForZone / zoneWatts', () => {
  const cats = [cat('gpu'), cat('cpu'), cat('ram'), cat('os', 'Operating System')]
  const stick = named('ram-1', 'cat-ram', { tdpWatts: 8 })
  const stick2 = named('ram-2', 'cat-ram', { tdpWatts: 8 })
  const gpu = named('gpu-1', 'cat-gpu', { tdpWatts: 350 })
  const index = indexOf(cats, [stick, stick2, gpu])

  it('#342 zone → category via mapped slug; zone without category → undefined', () => {
    expect(categoryForZone('gpu', cats)?.id).toBe('cat-gpu')
    expect(categoryForZone('ram', cats)?.id).toBe('cat-ram')
    expect(categoryForZone('psu', cats)).toBeUndefined()
    // categories without a zone (os) never steal a zone
    expect(categoryForZone('case', cats)).toBeUndefined()
  })

  it('#343 picksForZone returns installed entries in order, incl. multi-pick', () => {
    const selections = { 'cat-ram': ['ram-1', 'ram-2'], 'cat-gpu': ['gpu-1'] }
    expect(picksForZone('ram', selections, index).map((e) => e.id)).toEqual(['ram-1', 'ram-2'])
    expect(picksForZone('gpu', selections, index).map((e) => e.id)).toEqual(['gpu-1'])
    // zone without a category or without picks → empty array
    expect(picksForZone('psu', selections, index)).toEqual([])
    expect(picksForZone('cpu', selections, index)).toEqual([])
    // stale ids (no longer in the index) get filtered out
    expect(picksForZone('gpu', { 'cat-gpu': ['ghost'] }, index)).toEqual([])
  })

  it('#344 zoneWatts sums tdpWatts of the zone picks', () => {
    const selections = { 'cat-ram': ['ram-1', 'ram-2'], 'cat-gpu': ['gpu-1'] }
    expect(zoneWatts('ram', selections, index)).toBe(16)
    expect(zoneWatts('gpu', selections, index)).toBe(350)
    expect(zoneWatts('cpu', selections, index)).toBe(0)
    expect(zoneWatts('aio', selections, index)).toBe(0)
  })
})

describe('heatmapWeight', () => {
  it('#345 weight 0..1 = wattsOf(entry)/maxWatts, clamped', () => {
    expect(heatmapWeight(entry({ tdpWatts: 350 }), 700)).toBeCloseTo(0.5)
    expect(heatmapWeight(entry({ tdpWatts: 700 }), 700)).toBe(1)
    expect(heatmapWeight(entry({ tdpWatts: 800 }), 700)).toBe(1)
    expect(heatmapWeight(entry({}), 700)).toBe(0)
    expect(heatmapWeight(undefined, 700)).toBe(0)
  })

  it('#346 maxWatts <= 0 / non-finite → 0 (never NaN in markup)', () => {
    const hot = entry({ tdpWatts: 350 })
    expect(heatmapWeight(hot, 0)).toBe(0)
    expect(heatmapWeight(hot, -1)).toBe(0)
    expect(heatmapWeight(hot, Number.NaN)).toBe(0)
    expect(heatmapWeight(hot, Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('psuRatedWatts / psuMargin', () => {
  const psuCat = cat('psu', 'Power Supply')
  const psu850 = named('psu-1', 'cat-psu', { psuWatts: 850 })
  const psuNoSpec = named('psu-2', 'cat-psu', {})
  const index = indexOf([psuCat], [psu850, psuNoSpec])
  const result = { recommendedPsuWatts: 600 }

  it('#347 rated = first pick psuWatts; margin = rated − recommended', () => {
    expect(psuRatedWatts({ 'cat-psu': ['psu-1'] }, index)).toBe(850)
    expect(psuMargin(result, { 'cat-psu': ['psu-1'] }, index)).toBe(250)
  })

  it('#348 undersized PSU → negative margin; no PSU/spec → null', () => {
    expect(psuMargin({ recommendedPsuWatts: 900 }, { 'cat-psu': ['psu-1'] }, index)).toBe(-50)
    expect(psuMargin(result, {}, index)).toBeNull()
    expect(psuRatedWatts({ 'cat-psu': ['psu-2'] }, index)).toBeNull()
    expect(psuMargin(result, { 'cat-psu': ['psu-2'] }, index)).toBeNull()
    // psuWatts can come from display.specs (seed §7 specsJson)
    const psuDisplay = named('psu-3', 'cat-psu', {}, { name: 'P', specs: { psuWatts: 1000 } })
    const idx2 = indexOf([psuCat], [psuDisplay])
    expect(psuMargin(result, { 'cat-psu': ['psu-3'] }, idx2)).toBe(400)
  })
})

describe('gpuFit', () => {
  const gpuWith = (gpuLengthMm?: number) => named('g', 'cat-gpu', gpuLengthMm === undefined ? {} : { gpuLengthMm })
  const caseWith = (caseGpuMaxLengthMm?: number) =>
    named('c', 'cat-case', caseGpuMaxLengthMm === undefined ? {} : { caseGpuMaxLengthMm })

  it('#349 clearance > threshold → ok; <= threshold → tight; negative → oversize', () => {
    expect(gpuFit(gpuWith(300), caseWith(420))).toBe('ok')
    expect(gpuFit(gpuWith(420 - GPU_FIT_TIGHT_MM), caseWith(420))).toBe('tight')
    expect(gpuFit(gpuWith(419), caseWith(420))).toBe('tight')
    expect(gpuFit(gpuWith(421), caseWith(420))).toBe('oversize')
  })

  it('#350 missing spec → null (pill hidden, never "undefined")', () => {
    expect(gpuFit(gpuWith(), caseWith(420))).toBeNull()
    expect(gpuFit(gpuWith(300), caseWith())).toBeNull()
    expect(gpuFit(undefined, caseWith(420))).toBeNull()
    expect(gpuFit(gpuWith(300), undefined)).toBeNull()
  })
})

describe('rgbLinkedCount', () => {
  it('#351 counts picks with display.hasRgb, unknown ids excluded', () => {
    const index = indexOf(
      [cat('gpu'), cat('ram')],
      [
        named('a', 'cat-gpu', {}, { name: 'RGB GPU', hasRgb: true }),
        named('b', 'cat-ram', {}, { name: 'RGB RAM', hasRgb: true }),
        named('c', 'cat-ram', {}, { name: 'Stealth RAM' }),
      ],
    )
    expect(rgbLinkedCount({ 'cat-gpu': ['a'], 'cat-ram': ['b', 'c'] }, index)).toBe(2)
    expect(rgbLinkedCount({ 'cat-gpu': ['a', 'ghost-id'] }, index)).toBe(1)
    expect(rgbLinkedCount({}, index)).toBe(0)
  })
})

describe('numSpecOf / textSpecOf', () => {
  it('#352 reads specs then display.specs; NaN/empty → null', () => {
    const e = entry({ gpuLengthMm: 322 }, { name: 'G', specs: { pcieVersion: '5.0' } })
    expect(numSpecOf(e, 'gpuLengthMm')).toBe(322)
    expect(textSpecOf(e, 'pcieVersion')).toBe('5.0')
    expect(numSpecOf(e, 'pcieVersion')).toBeNull()
    expect(textSpecOf(e, 'gpuLengthMm')).toBeNull()
    expect(numSpecOf(entry({ tdpWatts: Number.NaN }), 'tdpWatts')).toBeNull()
    expect(numSpecOf(undefined, 'x')).toBeNull()
  })
})



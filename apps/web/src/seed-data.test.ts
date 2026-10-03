import { describe, it, expect } from 'vitest'
import { attributeDefs, buildTemplateDefs, productDefs, rules, slotCategoryDefs } from './seed-data.ts'

/**
 * Seed-data invariants (plan item C6). The seed only runs on a fresh DB, so a
 * bad reference (a template slot pointing at a non-builder product) used to
 * surface as a runtime crash mid-seed — these checks fail a test instead.
 */
const builderTitles = new Set(productDefs.filter((p) => p.builder).map((p) => p.title))
const slotSlugs = new Set(slotCategoryDefs.map((s) => s.slug))
const attributeSlugs = new Set(attributeDefs.map(([slug]) => slug))
const attributeValuesBySlug = new Map(attributeDefs.map(([slug, , , values]) => [slug, new Set(values)]))
const productTitles = new Set(productDefs.map((p) => p.title))

describe('seed data invariants', () => {
  it('#264 every template slot references a builder component in a real slot category', () => {
    for (const tpl of buildTemplateDefs) {
      for (const [categorySlug, title] of tpl.slots) {
        expect(slotSlugs, `${tpl.slug} → category ${categorySlug}`).toContain(categorySlug)
        expect(builderTitles, `${tpl.slug} → ${title}`).toContain(title)
      }
    }
  })

  it('#265 every component maps to a slot category that exists', () => {
    for (const p of productDefs) {
      if (!p.builder) continue
      expect(slotSlugs, `${p.title} → ${p.builder.cat}`).toContain(p.builder.cat)
    }
  })

  it('#266 product attributes reference real attribute types and values', () => {
    for (const p of productDefs) {
      for (const [slug, value] of Object.entries(p.attrs ?? {})) {
        expect(attributeSlugs, `${p.title} → ${slug}`).toContain(slug)
        expect([...attributeValuesBySlug.get(slug)!], `${p.title} → ${slug}:${value}`).toContain(value)
      }
    }
  })

  it('#267 rule fixtures reference real products/categories and stay ≥ 40', () => {
    expect(rules.length).toBeGreaterThanOrEqual(40)
    for (const r of rules) {
      if (r.st === 'component') expect(productTitles, `rule subject ${r.s}`).toContain(r.s)
      else expect(slotSlugs, `rule subject category ${r.s}`).toContain(r.s)
      expect(slotSlugs, `rule target category ${r.tCat}`).toContain(r.tCat)
      if (r.t) expect(productTitles, `rule target ${r.t}`).toContain(r.t)
    }
  })

  it('#268 spec counts hold: 10 slot categories, 3 templates, 20 ordinary products', () => {
    expect(slotCategoryDefs).toHaveLength(10)
    expect(buildTemplateDefs).toHaveLength(3)
    const ordinary = productDefs.filter((p) => !p.builder)
    expect(ordinary.length).toBeGreaterThanOrEqual(20)
  })

  it('#359 every motherboard carries numeric ramSlots + m2Slots (resolveSlotLimits hosts)', () => {
    const mobos = productDefs.filter((p) => p.builder?.cat === 'motherboard')
    expect(mobos.length).toBeGreaterThanOrEqual(2)
    for (const m of mobos) {
      expect(typeof m.builder!.spec.ramSlots, `${m.title} ramSlots`).toBe('number')
      expect(typeof m.builder!.spec.m2Slots, `${m.title} m2Slots`).toBe('number')
      // ITX boards must cap lower than ATX — the demo needs both bindings visible.
      if (m.builder!.spec.moboFormFactor === 'ITX') {
        expect(m.builder!.spec.ramSlots as number).toBeLessThanOrEqual(2)
      }
    }
  })

  it('#360 specsJson values stay cosmeticSpecs-compatible (primitives + flat primitive arrays)', () => {
    for (const p of productDefs) {
      const specsJson = p.builder?.spec.specsJson
      if (!specsJson) continue
      expect(typeof specsJson, `${p.title} specsJson must be a record`).toBe('object')
      for (const [key, value] of Object.entries(specsJson)) {
        const ok =
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          (Array.isArray(value) &&
            value.every((v) => typeof v === 'string' || typeof v === 'number'))
        expect(ok, `${p.title} specsJson.${key} (${JSON.stringify(value)})`).toBe(true)
      }
    }
  })

  it('#361 ram + storage slots allow 4 picks so motherboard caps demonstrably bind', () => {
    const maxOf = (slug: string) =>
      slotCategoryDefs.find((s) => s.slug === slug)?.maxSelectable ?? 1
    expect(maxOf('ram')).toBe(4)
    expect(maxOf('storage')).toBe(4)
    // And there must be enough compatible options to hit a 2-cap board.
    const ddr5Kits = productDefs.filter(
      (p) => p.builder?.cat === 'ram' && p.builder.spec.ramType === 'DDR5',
    )
    expect(ddr5Kits.length).toBeGreaterThanOrEqual(3)
  })

  it('#362 rule-critical specs stay complete (power + fit chain has no gaps)', () => {
    for (const p of productDefs) {
      if (!p.builder) continue
      const { cat, spec } = p.builder
      if (cat === 'cpu' || cat === 'gpu') {
        expect(typeof spec.tdpWatts, `${p.title} tdpWatts`).toBe('number')
      }
      if (cat === 'gpu') {
        expect(typeof spec.gpuLengthMm, `${p.title} gpuLengthMm`).toBe('number')
      }
      if (cat === 'psu') {
        expect(typeof spec.psuWatts, `${p.title} psuWatts`).toBe('number')
      }
      if (cat === 'case') {
        expect(typeof spec.caseGpuMaxLengthMm, `${p.title} caseGpuMaxLengthMm`).toBe('number')
        expect(spec.caseSupportedFormFactors, `${p.title} form factors`).toBeInstanceOf(Array)
      }
      if (spec.hasRgb !== undefined) {
        expect(typeof spec.hasRgb, `${p.title} hasRgb`).toBe('boolean')
      }
    }
  })
})

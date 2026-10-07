import { describe, it, expect } from 'vitest'
import { SPEC_TEMPLATES, specTemplateFor, specLabel } from './spec-templates.ts'

describe('spec template registry', () => {
  it('covers every seeded builder category', () => {
    for (const slug of ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooling', 'case-fan', 'os']) {
      expect(SPEC_TEMPLATES, `missing template for ${slug}`).toHaveProperty(slug)
    }
  })

  it('template defs are well-formed (select types carry options, units are strings)', () => {
    for (const [slug, fields] of Object.entries(SPEC_TEMPLATES)) {
      const keys = new Set<string>()
      for (const f of fields) {
        expect(f.key, `${slug} field without key`).toBeTruthy()
        expect(f.label, `${slug}.${f.key} without label`).toBeTruthy()
        expect(keys.has(f.key), `${slug} duplicate key ${f.key}`).toBe(false)
        keys.add(f.key)
        if (f.type === 'select' || f.type === 'multiselect') {
          expect(f.options?.length, `${slug}.${f.key} select without options`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('specTemplateFor returns the category template or an empty list', () => {
    expect(specTemplateFor('psu').map((f) => f.key)).toEqual(['efficiency', 'modularity', 'fanSizeMm'])
    expect(specTemplateFor('os')).toEqual([])
    expect(specTemplateFor('nonexistent')).toEqual([])
  })

  it('specLabel resolves label + unit, falls back to the raw key', () => {
    expect(specLabel('gpu', 'vram')).toEqual({ label: 'VRAM', unit: 'GB' })
    expect(specLabel('gpu', 'unknownKey')).toEqual({ label: 'unknownKey' })
    expect(specLabel('os', 'anything')).toEqual({ label: 'anything' })
  })
})

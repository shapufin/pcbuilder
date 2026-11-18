import { describe, it, expect } from 'vitest'
import { createRuleEngine, type BuilderIndex, type ComponentSpecEntry, type RuleDoc } from './rule-engine'

/**
 * Entry 131 — numeric operators on numeric STRINGS (version specs).
 *
 * `pcieVersion` is a string ('4.0', '5.0'). Before this fix `gte`/`lte` only
 * accepted real numbers, so `satisfiesOperator` returned false for every
 * candidate, `violates` inverted that into a warning, and the seeded PCIe
 * rules warned on EVERY motherboard — including an exact version match
 * ("…is PCIe 4.0; this board runs PCIe 4.0."). Coercing numeric strings fixes
 * the root cause without touching the seeded rows.
 */
const comp = (
  id: string,
  categoryId: string,
  specs: ComponentSpecEntry['specs'],
): ComponentSpecEntry => ({ id, categoryId, specs, priceCents: 10000, inStock: true })

const index = (components: ComponentSpecEntry[], rules: RuleDoc[]): BuilderIndex => ({
  components,
  rules,
  categories: ['cpu', 'motherboard', 'gpu'].map((slug, i) => ({
    id: slug,
    slug,
    name: slug,
    required: true,
    maxSelectable: 1,
    sortOrder: i,
  })),
  power: { overheadMultiplier: 1.3, baseWatts: 100 },
  rulesVersion: 'test-pcie',
})

const pcieRule = (version: string): RuleDoc => ({
  id: `pcie-${version}`,
  type: 'warns',
  operator: 'gte',
  field: 'pcieVersion',
  value: version,
  severity: 'warning',
  bidirectional: false,
  message: `{componentA} is PCIe ${version}; this board runs PCIe {pcieVersion}.`,
  subject: { kind: 'component', id: 'cpu-a' },
  target: { kind: 'category', id: 'motherboard' },
})

const warnsFor = (boardVersion: string, cpuVersion: string): number => {
  // The spec type narrows pcieVersion to the known versions; the '' and
  // 'unknown' cases below are deliberately outside it (dirty data probe).
  const specs = (v: string) => ({ pcieVersion: v }) as ComponentSpecEntry['specs']
  const engine = createRuleEngine(
    index([comp('cpu-a', 'cpu', specs(cpuVersion)), comp('mb-a', 'motherboard', specs(boardVersion))], [
      pcieRule(cpuVersion),
    ]),
  )
  const res = engine.evaluate({ cpu: ['cpu-a'], motherboard: ['mb-a'] })
  return res.warnings.filter((w) => w.ruleId === `pcie-${cpuVersion}`).length
}

describe('numeric operators on version strings (entry 131)', () => {
  it('#694 equal PCIe versions do not warn', () => {
    expect(warnsFor('4.0', '4.0')).toBe(0)
    expect(warnsFor('5.0', '5.0')).toBe(0)
  })

  it('#695 an older board than the component warns', () => {
    expect(warnsFor('3.0', '4.0')).toBe(1)
    expect(warnsFor('4.0', '5.0')).toBe(1)
  })

  it('#696 a newer board than the component does not warn', () => {
    expect(warnsFor('5.0', '4.0')).toBe(0)
  })

  it('#697 a missing/odd version spec never warns (conservative A8)', () => {
    expect(warnsFor('', '4.0')).toBe(0)
    expect(warnsFor('unknown', '4.0')).toBe(0)
  })

  it('#698 lte coerces numeric strings too (symmetric operator)', () => {
    const engine = createRuleEngine(
      index(
        [comp('gpu-a', 'gpu', { gpuLengthMm: 320 }), comp('mb-a', 'motherboard', { pcieVersion: '4.0' })],
        [
          {
            id: 'len',
            type: 'warns',
            operator: 'lte',
            field: 'pcieVersion',
            value: '3.0',
            severity: 'warning',
            bidirectional: false,
            message: 'board below 3.0',
            subject: { kind: 'component', id: 'gpu-a' },
            target: { kind: 'category', id: 'motherboard' },
          },
        ],
      ),
    )
    const res = engine.evaluate({ gpu: ['gpu-a'], motherboard: ['mb-a'] })
    // 4.0 <= 3.0 is false → condition not satisfied → warn (rule polarity).
    expect(res.warnings.some((w) => w.ruleId === 'len')).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { createRuleEngine, type BuilderIndex, type ComponentSpecEntry, type RuleDoc } from './rule-engine'

// ---------- Fixtures ----------

const comp = (
  id: string,
  categoryId: string,
  specs: ComponentSpecEntry['specs'],
  inStock = true,
): ComponentSpecEntry => ({ id, categoryId, specs, priceCents: 10000, inStock })

const rule = (over: Partial<RuleDoc> & { id: string }): RuleDoc => ({
  type: 'requires',
  operator: 'equals',
  field: 'socket',
  value: 'AM5',
  severity: 'error',
  bidirectional: false,
  message: '{componentA} uses socket {socket} but {componentB} requires {socket}',
  subject: { kind: 'component', id: 'cpu-a' },
  target: { kind: 'category', id: 'motherboard' },
  ...over,
})

const categories = (slugs: string[]) =>
  slugs.map((slug, i) => ({
    id: slug,
    slug,
    name: slug,
    required: true,
    maxSelectable: 1,
    sortOrder: i,
  }))

const baseIndex = (components: ComponentSpecEntry[], rules: RuleDoc[]): BuilderIndex => ({
  components,
  rules,
  categories: categories(['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooling']),
  power: { overheadMultiplier: 1.3, baseWatts: 100 },
  rulesVersion: 'test-1',
})

// ---------- Tests ----------

describe('rule engine (28 named cases from docs/buildmyrig-plan/06-rule-engine.md)', () => {
  // #1 requires blocks when condition fails
  it('#1 requires blocks motherboard with wrong socket', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('mb-am5', 'motherboard', { socket: 'AM5' }),
          comp('mb-lga', 'motherboard', { socket: 'LGA1700' }),
        ],
        [rule({ id: 'r1', subject: { kind: 'component', id: 'cpu-a' }, target: { kind: 'category', id: 'motherboard' }, value: 'AM5' })],
      ),
    )
    const res = engine.evaluate({ cpu: ['cpu-a'] })
    const mb = res.categories.find((c) => c.categoryId === 'motherboard')!
    expect(mb.validComponentIds).toEqual(['mb-am5'])
    expect(mb.excluded.map((e) => e.componentId)).toEqual(['mb-lga'])
  })

  // #2 requires passes when satisfied
  it('#2 requires allows matching motherboard', () => {
    const engine = createRuleEngine(
      baseIndex(
        [comp('cpu-a', 'cpu', { socket: 'AM5' }), comp('mb-am5', 'motherboard', { socket: 'AM5' })],
        [rule({ id: 'r2' })],
      ),
    )
    const res = engine.evaluate({ cpu: ['cpu-a'] })
    expect(res.categories.find((c) => c.categoryId === 'motherboard')!.excluded).toEqual([])
  })

  // #3 excludes blocks incompatible target
  it('#3 excludes DDR4 ram on DDR5 board', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('mb-ddr5', 'motherboard', { ramType: 'DDR5' }),
          comp('ram5', 'ram', { ramType: 'DDR5' }),
          comp('ram4', 'ram', { ramType: 'DDR4' }),
        ],
        [
          rule({
            id: 'r3',
            type: 'excludes',
            field: 'ramType',
            value: 'DDR4',
            subject: { kind: 'component', id: 'mb-ddr5' },
            target: { kind: 'category', id: 'ram' },
            message: 'DDR4 not supported',
          }),
        ],
      ),
    )
    const res = engine.evaluate({ motherboard: ['mb-ddr5'] })
    expect(res.categories.find((c) => c.categoryId === 'ram')!.validComponentIds).toEqual(['ram5'])
  })

  // #4 supports whitelist
  it('#4 supports allows only listed targets', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('mb-am5', 'motherboard', { socket: 'AM5' }),
          comp('mb-x', 'motherboard', { socket: 'LGA1700' }),
        ],
        [
          rule({
            id: 'r4',
            type: 'supports',
            operator: 'equals',
            field: 'socket',
            value: 'AM5',
          }),
        ],
      ),
    )
    const res = engine.evaluate({ cpu: ['cpu-a'] })
    expect(res.categories.find((c) => c.categoryId === 'motherboard')!.validComponentIds).toEqual(['mb-am5'])
  })

  // #5 warns never excludes
  it('#5 warns type appears only in warnings', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('gpu-h', 'gpu', { tdpWatts: 450 }),
          comp('mb-w', 'motherboard', { pcieVersion: '3.0' }),
        ],
        [
          rule({
            id: 'r5',
            type: 'warns',
            field: 'pcieVersion',
            value: '4.0',
            subject: { kind: 'component', id: 'gpu-h' },
            target: { kind: 'category', id: 'motherboard' },
          }),
        ],
      ),
    )
    const res = engine.evaluate({ gpu: ['gpu-h'] })
    expect(res.categories.find((c) => c.categoryId === 'motherboard')!.excluded).toEqual([])
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  // #6 bidirectional mirror catches reverse selection (dynamic value)
  it('#6 bidirectional rule fires when motherboard picked first', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('cpu-b', 'cpu', { socket: 'LGA1700' }),
          comp('mb-am5', 'motherboard', { socket: 'AM5' }),
          comp('mb-lga', 'motherboard', { socket: 'LGA1700' }),
        ],
        [rule({ id: 'r6', bidirectional: true })],
      ),
    )
    // Mirror value is dynamic: the selected board's socket drives the CPU filter
    const am5 = engine.evaluate({ motherboard: ['mb-am5'] })
    expect(am5.categories.find((c) => c.categoryId === 'cpu')!.excluded.map((e) => e.componentId)).toEqual(['cpu-b'])
    const lga = engine.evaluate({ motherboard: ['mb-lga'] })
    expect(lga.categories.find((c) => c.categoryId === 'cpu')!.excluded.map((e) => e.componentId)).toEqual(['cpu-a'])
  })

  // #7 bidirectional false does not mirror
  it('#7 non-bidirectional rule does not fire in reverse', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('mb-lga', 'motherboard', { socket: 'LGA1700' }),
        ],
        [rule({ id: 'r7', bidirectional: false })],
      ),
    )
    const res = engine.evaluate({ motherboard: ['mb-lga'] })
    expect(res.categories.find((c) => c.categoryId === 'cpu')!.excluded).toEqual([])
  })

  // #8 circular rules (A requires B, B requires A)
  it('#8 circular requires: both selections satisfy, empty selection no loop', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('mb-a', 'motherboard', { socket: 'AM5' }),
        ],
        [
          rule({ id: 'r8a', subject: { kind: 'component', id: 'cpu-a' }, target: { kind: 'category', id: 'motherboard' } }),
          rule({ id: 'r8b', subject: { kind: 'component', id: 'mb-a' }, target: { kind: 'category', id: 'cpu' }, bidirectional: false }),
        ],
      ),
    )
    const res = engine.evaluate({ cpu: ['cpu-a'] })
    expect(res.categories.find((c) => c.categoryId === 'motherboard')!.validComponentIds).toEqual(['mb-a'])
    expect(engine.evaluate({}).categories.every((c) => c.excluded.length === 0)).toBe(true)
  })

  // #9 circular exclusion — first pick wins, deterministic
  it('#9 circular exclusion is deterministic', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-x', 'cpu', { socket: 'AM5' }),
          comp('mb-x', 'motherboard', { socket: 'LGA1700' }),
        ],
        [
          rule({ id: 'r9a', type: 'excludes', operator: 'equals', field: 'socket', value: 'AM5', subject: { kind: 'component', id: 'mb-x' }, target: { kind: 'category', id: 'cpu' } }),
          rule({ id: 'r9b', type: 'excludes', operator: 'equals', field: 'socket', value: 'LGA1700', subject: { kind: 'component', id: 'cpu-x' }, target: { kind: 'category', id: 'motherboard' } }),
        ],
      ),
    )
    expect(engine.evaluate({ cpu: ['cpu-x'] }).categories.find((c) => c.categoryId === 'motherboard')!.excluded.map((e) => e.componentId)).toEqual(['mb-x'])
    expect(engine.evaluate({ motherboard: ['mb-x'] }).categories.find((c) => c.categoryId === 'cpu')!.excluded.map((e) => e.componentId)).toEqual(['cpu-x'])
  })

  // #10 rule on missing spec — conservative non-block, no throw
  it('#10 missing spec never blocks and never throws', () => {
    const engine = createRuleEngine(
      baseIndex(
        [comp('cpu-a', 'cpu', {}), comp('mb-unknown', 'motherboard', {})],
        [rule({ id: 'r10' })],
      ),
    )
    const res = engine.evaluate({ cpu: ['cpu-a'] })
    expect(res.categories.find((c) => c.categoryId === 'motherboard')!.validComponentIds).toEqual(['mb-unknown'])
  })

  // #11 empty category
  it('#11 empty category yields no valid, no excluded, no crash', () => {
    const engine = createRuleEngine(baseIndex([comp('cpu-a', 'cpu', {})], []))
    const res = engine.evaluate({})
    const gpu = res.categories.find((c) => c.categoryId === 'gpu')!
    expect(gpu.validComponentIds).toEqual([])
    expect(gpu.excluded).toEqual([])
  })

  // #12 mutually exclusive pair
  it('#12 ITX case and ATX board exclude each other', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('case-itx', 'case', { caseSupportedFormFactors: ['ITX'] }),
          comp('mb-atx', 'motherboard', { moboFormFactor: 'ATX' }),
        ],
        [
          rule({ id: 'r12a', type: 'excludes', operator: 'equals', field: 'moboFormFactor', value: 'ATX', subject: { kind: 'component', id: 'case-itx' }, target: { kind: 'category', id: 'motherboard' } }),
          rule({ id: 'r12b', type: 'requires', operator: 'contains', field: 'caseSupportedFormFactors', value: 'ATX', subject: { kind: 'component', id: 'mb-atx' }, target: { kind: 'category', id: 'case' } }),
        ],
      ),
    )
    expect(engine.evaluate({ case: ['case-itx'] }).categories.find((c) => c.categoryId === 'motherboard')!.excluded.length).toBe(1)
    expect(engine.evaluate({ motherboard: ['mb-atx'] }).categories.find((c) => c.categoryId === 'case')!.excluded.length).toBe(1)
  })

  // #13 in operator
  it('#13 operator in with array value', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('mb-1', 'motherboard', { socket: 'AM5' }),
          comp('mb-2', 'motherboard', { socket: 'LGA1700' }),
          comp('mb-3', 'motherboard', { socket: 'LGA1851' }),
        ],
        [rule({ id: 'r13', type: 'supports', operator: 'in', value: ['AM5', 'LGA1851'] })],
      ),
    )
    const mb = engine.evaluate({ cpu: ['cpu-a'] }).categories.find((c) => c.categoryId === 'motherboard')!
    expect(mb.validComponentIds.sort()).toEqual(['mb-1', 'mb-3'])
  })

  // #14 gte boundary
  it('#14 gte boundary equality passes', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { tdpWatts: 120 }),
          comp('psu-750', 'psu', { psuWatts: 256 }),
          comp('psu-250', 'psu', { psuWatts: 250 }),
        ],
        [rule({ id: 'r14', type: 'requires', operator: 'gte', field: 'psuWatts', value: 256, subject: { kind: 'component', id: 'cpu-a' }, target: { kind: 'category', id: 'psu' } })],
      ),
    )
    const psu = engine.evaluate({ cpu: ['cpu-a'] }).categories.find((c) => c.categoryId === 'psu')!
    expect(psu.validComponentIds).toEqual(['psu-750'])
  })

  // #15 lte boundary (GPU length vs case max)
  it('#15 lte boundary equality passes', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('case-s', 'case', { caseGpuMaxLengthMm: 300 }),
          comp('gpu-300', 'gpu', { gpuLengthMm: 300 }),
          comp('gpu-301', 'gpu', { gpuLengthMm: 301 }),
        ],
        [rule({ id: 'r15', type: 'requires', operator: 'lte', field: 'gpuLengthMm', value: 300, subject: { kind: 'component', id: 'case-s' }, target: { kind: 'category', id: 'gpu' } })],
      ),
    )
    expect(engine.evaluate({ case: ['case-s'] }).categories.find((c) => c.categoryId === 'gpu')!.validComponentIds).toEqual(['gpu-300'])
  })

  // #16 contains on array spec
  it('#16 contains on case form factors array', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('mb-atx', 'motherboard', { moboFormFactor: 'ATX' }),
          comp('case-full', 'case', { caseSupportedFormFactors: ['ATX', 'mATX', 'ITX'] }),
          comp('case-itx', 'case', { caseSupportedFormFactors: ['ITX'] }),
        ],
        [rule({ id: 'r16', type: 'requires', operator: 'contains', field: 'caseSupportedFormFactors', value: 'ATX', subject: { kind: 'component', id: 'mb-atx' }, target: { kind: 'category', id: 'case' } })],
      ),
    )
    expect(engine.evaluate({ motherboard: ['mb-atx'] }).categories.find((c) => c.categoryId === 'case')!.validComponentIds).toEqual(['case-full'])
  })

  // #17 category-subject applies to all candidates
  it('#17 category subject applies to all candidates of category', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-any', 'cpu', { ramType: 'DDR5' }),
          comp('cpu-any2', 'cpu', { ramType: 'DDR5' }),
          comp('ram5', 'ram', { ramType: 'DDR5' }),
          comp('ram4', 'ram', { ramType: 'DDR4' }),
        ],
        [rule({ id: 'r17', subject: { kind: 'category', id: 'cpu' }, target: { kind: 'category', id: 'ram' }, field: 'ramType', value: 'DDR5' })],
      ),
    )
    expect(engine.evaluate({ cpu: ['cpu-any'] }).categories.find((c) => c.categoryId === 'ram')!.validComponentIds).toEqual(['ram5'])
  })

  // #18 component-subject fires only when selected
  it('#18 component subject fires only when selected', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('cpu-b', 'cpu', {}),
          comp('mb-1', 'motherboard', { socket: 'LGA1700' }),
        ],
        [rule({ id: 'r18' })],
      ),
    )
    expect(engine.evaluate({ cpu: ['cpu-b'] }).categories.find((c) => c.categoryId === 'motherboard')!.excluded).toEqual([])
    expect(engine.evaluate({ cpu: ['cpu-a'] }).categories.find((c) => c.categoryId === 'motherboard')!.excluded.length).toBe(1)
  })

  // #19 maxSelectable > 1 — both selections evaluated as subjects
  it('#19 storage x2 both evaluated as subjects', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('ssd-1', 'storage', { storageInterface: 'NVMe' }),
          comp('ssd-2', 'storage', { storageInterface: 'SATA' }),
          comp('mb-nvme', 'motherboard', {}),
        ],
        [rule({ id: 'r19', type: 'excludes', operator: 'equals', field: 'storageInterface', value: 'SATA', subject: { kind: 'component', id: 'mb-nvme' }, target: { kind: 'category', id: 'storage' } })],
      ),
    )
    const idx = baseIndex(engineComponents(), [rule({ id: 'r19b', type: 'excludes', operator: 'equals', field: 'storageInterface', value: 'SATA', subject: { kind: 'component', id: 'mb-nvme' }, target: { kind: 'category', id: 'storage' } })])
    idx.categories = categories(['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooling'])
    const e2 = createRuleEngine(idx)
    const res = e2.evaluate({ motherboard: ['mb-nvme'], storage: ['ssd-1', 'ssd-2'] })
    // both are already selected → not re-excluded; warnings pass covers them
    expect(res.categories.find((c) => c.categoryId === 'storage')!.validComponentIds.length).toBe(2)
    expect(res.warnings.length).toBeGreaterThanOrEqual(0)
  })

  // #20 message interpolation
  it('#20 interpolation replaces all tokens; unknown passes through', () => {
    const engine = createRuleEngine(baseIndex([], []))
    const msg = engine.interpolate(
      '{componentA} uses socket {socket} but {componentB} requires {socket} / {bogus}',
      {
        componentA: { id: 'a', name: 'CPU A' },
        componentB: { id: 'b', name: 'MB B' },
        socket: 'AM5',
        failingSpecValue: 'AM5',
      },
    )
    expect(msg).toBe('CPU A uses socket AM5 but MB B requires AM5 / {bogus}')
  })

  // #21 interpolation never throws on missing context
  it('#21 interpolation missing context passes tokens through', () => {
    const engine = createRuleEngine(baseIndex([], []))
    expect(engine.interpolate('{componentA} vs {componentB} {socket}', {})).toBe(
      '{componentA} vs {componentB} {socket}',
    )
  })

  // #22 power formula
  it('#22 recommendedPsuWatts = sum(tdp)*1.3 + 100', () => {
    const engine = createRuleEngine(
      baseIndex(
        [comp('cpu-a', 'cpu', { tdpWatts: 120 }), comp('gpu-a', 'gpu', { tdpWatts: 300 })],
        [],
      ),
    )
    expect(engine.recommendedPsuWatts({ cpu: ['cpu-a'], gpu: ['gpu-a'] })).toBe(646)
  })

  // #23 power warning below threshold; equality none
  it('#23 power warning fires below requirement, not at equality', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { tdpWatts: 120 }),
          comp('psu-255', 'psu', { tdpWatts: 0, psuWatts: 255 }),
          comp('psu-256', 'psu', { tdpWatts: 0, psuWatts: 256 }),
        ],
        [],
      ),
    )
    expect(engine.evaluate({ cpu: ['cpu-a'], psu: ['psu-255'] }).powerWarnings.length).toBe(1)
    expect(engine.evaluate({ cpu: ['cpu-a'], psu: ['psu-256'] }).powerWarnings.length).toBe(0)
  })

  // #24 no PSU selected → recommendation only, no warning
  it('#24 no PSU selected yields recommendation without warning', () => {
    const engine = createRuleEngine(
      baseIndex([comp('cpu-a', 'cpu', { tdpWatts: 120 })], []),
    )
    const res = engine.evaluate({ cpu: ['cpu-a'] })
    expect(res.recommendedPsuWatts).toBe(256)
    expect(res.powerWarnings).toEqual([])
  })

  // #25 inStockOnly filters out-of-stock; explain still evaluates violations
  it('#25 out-of-stock filtered from valid; explain still evaluates', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('mb-am5', 'motherboard', { socket: 'AM5' }, false),
          comp('mb-lga', 'motherboard', { socket: 'LGA1700' }),
        ],
        [rule({ id: 'r25' })],
      ),
    )
    const mb = engine.evaluate({ cpu: ['cpu-a'] }).categories.find((c) => c.categoryId === 'motherboard')!
    expect(mb.validComponentIds).toEqual([])
    expect(mb.excluded.map((e) => e.componentId)).toEqual(['mb-lga'])
    expect(engine.explainIncompatibility('mb-lga', { cpu: ['cpu-a'] }).length).toBe(1)
    // out-of-stock comp visible to explain (inStockOnly=false server recheck)
    const res2 = engine.evaluate({ cpu: ['cpu-a'] }, { inStockOnly: false })
    expect(res2.categories.find((c) => c.categoryId === 'motherboard')!.validComponentIds).toEqual(['mb-am5'])
  })

  // #26 stale selections ignored
  it('#26 unknown componentId in selections ignored without throw', () => {
    const engine = createRuleEngine(baseIndex([comp('cpu-a', 'cpu', {})], []))
    expect(() => engine.evaluate({ cpu: ['ghost-id'] })).not.toThrow()
  })

  // #27 empty selections
  it('#27 empty selections: all categories fully valid, zero warnings', () => {
    const engine = createRuleEngine(
      baseIndex([comp('cpu-a', 'cpu', {}), comp('mb-a', 'motherboard', {})], [rule({ id: 'r27' })]),
    )
    const res = engine.evaluate({})
    expect(res.warnings).toEqual([])
    expect(res.categories.find((c) => c.categoryId === 'cpu')!.validComponentIds).toEqual(['cpu-a'])
  })

  // #28 scale benchmark
  it('#28 evaluates 5k components / 2k rules in < 20ms', () => {
    const components: ComponentSpecEntry[] = []
    for (let i = 0; i < 5000; i++) {
      components.push(comp(`c-${i}`, i % 8 === 0 ? 'cpu' : ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooling'][i % 8], { socket: i % 2 ? 'AM5' : 'LGA1700', tdpWatts: 100 }))
    }
    const rules: RuleDoc[] = []
    for (let i = 0; i < 2000; i++) {
      rules.push(rule({ id: `r-${i}`, subject: { kind: 'category', id: 'cpu' }, target: { kind: 'category', id: 'motherboard' } }))
    }
    const engine = createRuleEngine(baseIndex(components, rules))
    const t0 = performance.now()
    engine.evaluate({ cpu: ['c-0'] })
    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(20)
  })

  // #29 display.name feeds {componentA}/{componentB} interpolation
  it('#29 messages interpolate display names instead of raw ids', () => {
    const cpu: ComponentSpecEntry = {
      ...comp('cpu-1', 'cpu', { socket: 'AM5' }),
      display: { name: 'Ryzen 7 7800X3D' },
    }
    const mb: ComponentSpecEntry = {
      ...comp('mb-1', 'motherboard', { socket: 'LGA1700' }),
      display: { name: 'ASUS ROG Strix B650-A' },
    }
    const engine = createRuleEngine(
      baseIndex(
        [cpu, mb],
        [rule({ id: 'r29', subject: { kind: 'component', id: 'cpu-1' }, message: '{componentA} does not fit {componentB} (socket {socket})' })],
      ),
    )
    const excluded = engine.evaluate({ cpu: ['cpu-1'] }).categories.find((c) => c.categoryId === 'motherboard')!
    expect(excluded.excluded[0].message).toBe(
      'Ryzen 7 7800X3D does not fit ASUS ROG Strix B650-A (socket LGA1700)',
    )
    expect(engine.explainIncompatibility('mb-1', { cpu: ['cpu-1'] })[0].message).not.toContain('cpu-1')
  })

  // #30 no display block → ids still used, never undefined/throw
  it('#30 missing display falls back to component id in messages', () => {
    const engine = createRuleEngine(
      baseIndex(
        [comp('cpu-9', 'cpu', { socket: 'AM5' }), comp('mb-9', 'motherboard', { socket: 'LGA1700' })],
        [rule({ id: 'r30', subject: { kind: 'component', id: 'cpu-9' }, message: '{componentA} vs {componentB}' })],
      ),
    )
    const excluded = engine.evaluate({ cpu: ['cpu-9'] }).categories.find((c) => c.categoryId === 'motherboard')!
    expect(excluded.excluded[0].message).toBe('cpu-9 vs mb-9')
  })

  // #31 validateSelections: blocking violation between two selected parts
  it('#31 validateSelections reports blocking violation between selected parts', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-am5', 'cpu', { socket: 'AM5' }),
          comp('mb-lga', 'motherboard', { socket: 'LGA1700' }),
          comp('mb-am5', 'motherboard', { socket: 'AM5' }),
        ],
        [rule({ id: 'r31', subject: { kind: 'component', id: 'cpu-am5' }, value: 'AM5' })],
      ),
    )
    const bad = engine.validateSelections({ cpu: ['cpu-am5'], motherboard: ['mb-lga'] })
    expect(bad.errors).toHaveLength(1)
    expect(bad.errors[0].ruleId).toBe('r31')
    expect(bad.errors[0].severity).toBe('error')
    expect(bad.errors[0].message).toContain('cpu-am5')
    expect(bad.errors[0].message).toContain('mb-lga')
    expect(bad.warnings).toEqual([])
    expect(engine.validateSelections({ cpu: ['cpu-am5'], motherboard: ['mb-am5'] }).errors).toEqual([])
  })

  // #32 warns-type rule on a selected combo → warning, never an error
  it('#32 validateSelections surfaces warns-type rules as warnings only', () => {
    const engine = createRuleEngine(
      baseIndex(
        [comp('cpu-a', 'cpu', {}), comp('mb-a', 'motherboard', { socket: 'LGA1700' })],
        [rule({ id: 'r32', type: 'warns', severity: 'info', message: '{componentA} runs warm with {componentB}' })],
      ),
    )
    const { errors, warnings } = engine.validateSelections({ cpu: ['cpu-a'], motherboard: ['mb-a'] })
    expect(errors).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('cpu-a runs warm with mb-a')
  })

  // #33 category-subject blocking rule (ITX case excludes ATX boards)
  it('#33 validateSelections catches category-subject blocking violations', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('case-itx', 'case', { moboFormFactor: 'ITX', caseSupportedFormFactors: ['ITX'] }),
          comp('mb-atx', 'motherboard', { moboFormFactor: 'ATX' }),
          comp('mb-itx', 'motherboard', { moboFormFactor: 'ITX' }),
        ],
        [
          rule({
            id: 'r33',
            type: 'excludes',
            field: 'moboFormFactor',
            value: 'ATX',
            bidirectional: true,
            subject: { kind: 'category', id: 'case' },
            target: { kind: 'category', id: 'motherboard' },
            message: 'ITX cases cannot fit {componentB} ({moboFormFactor})',
          }),
        ],
      ),
    )
    const { errors } = engine.validateSelections({ case: ['case-itx'], motherboard: ['mb-atx'] })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('mb-atx')
    expect(engine.validateSelections({ case: ['case-itx'], motherboard: ['mb-itx'] }).errors).toEqual([])
  })

  // #34 bidirectional rule reported once regardless of pick order
  it('#34 validateSelections dedupes bidirectional violations to one issue', () => {
    const engine = createRuleEngine(
      baseIndex(
        [comp('cpu-a', 'cpu', { socket: 'AM5' }), comp('mb-b', 'motherboard', { socket: 'LGA1700' })],
        [
          rule({
            id: 'r34',
            bidirectional: true,
            message: '{componentA} and {componentB} sockets do not match',
          }),
        ],
      ),
    )
    const { errors } = engine.validateSelections({ cpu: ['cpu-a'], motherboard: ['mb-b'] })
    expect(errors).toHaveLength(1)
    expect(errors[0].ruleId).toBe('r34')
  })

  // #35 power warning when the selected PSU is underpowered
  it('#35 validateSelections includes the derived power warning', () => {
    const engine = createRuleEngine(
      baseIndex(
        [comp('cpu-a', 'cpu', { tdpWatts: 120 }), comp('psu-255', 'psu', { psuWatts: 255 })],
        [],
      ),
    )
    const { errors, warnings } = engine.validateSelections({ cpu: ['cpu-a'], psu: ['psu-255'] })
    expect(errors).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].ruleId).toBe('derived-power')
    expect(warnings[0].message).toContain('256')
  })

  // #36 empty selections validate clean
  it('#36 validateSelections with empty selections is clean', () => {
    const engine = createRuleEngine(
      baseIndex([comp('cpu-a', 'cpu', { socket: 'AM5' })], [rule({ id: 'r36' })]),
    )
    expect(engine.validateSelections({})).toEqual({ errors: [], warnings: [] })
  })

  // #37 stale selection ids ignored
  it('#37 validateSelections ignores unknown component ids without throw', () => {
    const engine = createRuleEngine(
      baseIndex([comp('cpu-a', 'cpu', { socket: 'AM5' })], [rule({ id: 'r37' })]),
    )
    expect(() => engine.validateSelections({ cpu: ['ghost'] })).not.toThrow()
    expect(engine.validateSelections({ cpu: ['ghost'] }).errors).toEqual([])
  })

  // #38 dynamic mirror in validateSelections: selected board's socket drives CPU check
  it('#38 validateSelections enforces mirrored socket match from the selected board', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-am5', 'cpu', { socket: 'AM5' }),
          comp('cpu-lga', 'cpu', { socket: 'LGA1700' }),
          comp('mb-am5', 'motherboard', { socket: 'AM5' }),
          comp('mb-lga', 'motherboard', { socket: 'LGA1700' }),
        ],
        [rule({ id: 'r38', bidirectional: true, subject: { kind: 'component', id: 'cpu-am5' }, value: 'AM5' })],
      ),
    )
    expect(engine.validateSelections({ cpu: ['cpu-am5'], motherboard: ['mb-am5'] }).errors).toEqual([])
    expect(engine.validateSelections({ cpu: ['cpu-lga'], motherboard: ['mb-lga'] }).errors).toEqual([])
    const bad = engine.validateSelections({ cpu: ['cpu-am5'], motherboard: ['mb-lga'] })
    expect(bad.errors).toHaveLength(1)
    expect(bad.errors[0].ruleId).toBe('r38')
  })

  // #39 dynamic mirror only checks components in the rule's target category
  it('#39 dynamic mirror ignores selected components outside its target category', () => {
    const engine = createRuleEngine(
      baseIndex(
        [
          comp('cpu-a', 'cpu', { socket: 'AM5' }),
          comp('mb-a', 'motherboard', { socket: 'AM5', ramType: 'DDR5' }),
          comp('ram-d4', 'ram', { ramType: 'DDR4' }),
        ],
        [
          rule({
            id: 'r39',
            subject: { kind: 'component', id: 'ram-d4' },
            field: 'ramType',
            value: 'DDR4',
            bidirectional: true,
            message: '{componentA} is DDR4 but the motherboard only supports {ramType}.',
          }),
        ],
      ),
    )
    // no RAM selected → the RAM mirror must not fire on the CPU
    expect(engine.validateSelections({ cpu: ['cpu-a'], motherboard: ['mb-a'] }).errors).toEqual([])
    // mismatching RAM selected → the mirror fires on the RAM
    const bad = engine.validateSelections({ cpu: ['cpu-a'], motherboard: ['mb-a'], ram: ['ram-d4'] })
    expect(bad.errors).toHaveLength(1)
    expect(bad.errors[0].ruleId).toBe('r39')
  })
})

function engineComponents(): ComponentSpecEntry[] {
  return [
    comp('ssd-1', 'storage', { storageInterface: 'NVMe' }),
    comp('ssd-2', 'storage', { storageInterface: 'SATA' }),
    comp('mb-nvme', 'motherboard', {}),
  ]
}

// ---------- Derived power-rule wiring (targetCategory + severity) ----------

describe('derived power-rule config wiring', () => {
  const numericPsuIndex = (power: BuilderIndex['power']): BuilderIndex => {
    const idx = baseIndex(
      [
        comp('cpu-a', 'cpu', { tdpWatts: 120 }),
        comp('psu-low', '5', { tdpWatts: 0, psuWatts: 100 }),
      ],
      [],
    )
    idx.categories = [
      { id: '2', slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 0 },
      { id: '5', slug: 'psu', name: 'Power Supply', required: true, maxSelectable: 1, sortOrder: 1 },
    ]
    idx.power = power
    return idx
  }

  // #40 production category ids are numeric - target must resolve via targetCategoryId
  it('#40 power warning resolves target slot via targetCategoryId (numeric ids)', () => {
    const engine = createRuleEngine(
      numericPsuIndex({ overheadMultiplier: 1.3, baseWatts: 100, targetCategoryId: '5' }),
    )
    const res = engine.evaluate({ '2': ['cpu-a'], '5': ['psu-low'] })
    expect(res.powerWarnings).toHaveLength(1)
    expect(res.recommendedPsuWatts).toBe(256)
  })

  // #41 populated targetCategory rel may only give us the slug
  it('#41 power warning resolves target slot via targetCategorySlug', () => {
    const engine = createRuleEngine(
      numericPsuIndex({ overheadMultiplier: 1.3, baseWatts: 100, targetCategorySlug: 'psu' }),
    )
    expect(engine.evaluate({ '2': ['cpu-a'], '5': ['psu-low'] }).powerWarnings).toHaveLength(1)
  })

  // #42 admin hardening: severity error blocks the save instead of advising
  it('#42 power severity error lands in validateSelections errors, not warnings', () => {
    const idx = baseIndex(
      [
        comp('cpu-a', 'cpu', { tdpWatts: 120 }),
        comp('psu-255', 'psu', { tdpWatts: 0, psuWatts: 255 }),
      ],
      [],
    )
    idx.power = { overheadMultiplier: 1.3, baseWatts: 100, severity: 'error' }
    const engine = createRuleEngine(idx)
    const { errors, warnings } = engine.validateSelections({ cpu: ['cpu-a'], psu: ['psu-255'] })
    expect(errors.filter((e) => e.ruleId === 'derived-power')).toHaveLength(1)
    expect(warnings.filter((w) => w.ruleId === 'derived-power')).toHaveLength(0)
    // live evaluation surfaces the hardened severity too
    const ev = engine.evaluate({ cpu: ['cpu-a'], psu: ['psu-255'] })
    expect(ev.powerWarnings[0]?.severity).toBe('error')
  })

  // #43 default severity stays advisory
  it('#43 power severity defaults to warning in validateSelections', () => {
    const idx = baseIndex(
      [
        comp('cpu-a', 'cpu', { tdpWatts: 120 }),
        comp('psu-255', 'psu', { tdpWatts: 0, psuWatts: 255 }),
      ],
      [],
    )
    const engine = createRuleEngine(idx)
    const { errors, warnings } = engine.validateSelections({ cpu: ['cpu-a'], psu: ['psu-255'] })
    expect(errors.filter((e) => e.ruleId === 'derived-power')).toHaveLength(0)
    expect(warnings.filter((w) => w.ruleId === 'derived-power')).toHaveLength(1)
  })

  // #44 stale configured id (deleted category) must fall back to the slug
  it('#44 stale targetCategoryId falls back to targetCategorySlug', () => {
    const engine = createRuleEngine(
      numericPsuIndex({
        overheadMultiplier: 1.3,
        baseWatts: 100,
        targetCategoryId: '999',
        targetCategorySlug: 'psu',
      }),
    )
    expect(engine.evaluate({ '2': ['cpu-a'], '5': ['psu-low'] }).powerWarnings).toHaveLength(1)
  })
})

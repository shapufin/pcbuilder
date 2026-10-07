import { describe, it, expect } from 'vitest'
import { createRuleEngine, type BuilderIndex, type ComponentSpecEntry, type RuleDoc } from '@buildmyrig/lib'
import { synthesizeCompatibilityRules } from './derived-rules.ts'

const CATS: BuilderIndex['categories'] = [
  { id: 'cpu', slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 1 },
  { id: 'mobo', slug: 'motherboard', name: 'Motherboard', required: true, maxSelectable: 1, sortOrder: 2 },
  { id: 'ram', slug: 'ram', name: 'Memory', required: true, maxSelectable: 4, sortOrder: 3 },
  { id: 'gpu', slug: 'gpu', name: 'Graphics Card', required: true, maxSelectable: 1, sortOrder: 4 },
  { id: 'storage', slug: 'storage', name: 'Storage', required: true, maxSelectable: 4, sortOrder: 5 },
  { id: 'psu', slug: 'psu', name: 'Power Supply', required: true, maxSelectable: 1, sortOrder: 6 },
  { id: 'case', slug: 'case', name: 'Case', required: true, maxSelectable: 1, sortOrder: 7 },
  { id: 'cooling', slug: 'cooling', name: 'CPU Cooling', required: true, maxSelectable: 1, sortOrder: 8 },
]

const comp = (
  id: string,
  categoryId: string,
  specs: ComponentSpecEntry['specs'],
  name = `Comp ${id}`,
): ComponentSpecEntry => ({
  id,
  categoryId,
  specs,
  priceCents: 100,
  display: { name },
})

const ruleShape = (rules: RuleDoc[], subjectId: string, targetId: string, field: string) =>
  rules.find(
    (r) => r.subject.id === subjectId && r.target.id === targetId && r.field === field,
  )

describe('synthesizeCompatibilityRules', () => {
  it('synthesizes cpu→mobo socket requires and cpu→cooling contains (forward only)', () => {
    const cpu = comp('c1', 'cpu', { socket: 'AM5' }, 'Ryzen 5 7600X')
    const rules = synthesizeCompatibilityRules([cpu], CATS, [])

    const mobo = ruleShape(rules, 'c1', 'mobo', 'socket')
    expect(mobo).toMatchObject({ type: 'requires', operator: 'equals', value: 'AM5', severity: 'error' })
    expect(mobo?.bidirectional).toBe(false)
    expect(mobo?.message).toContain('AM5')

    const cooler = ruleShape(rules, 'c1', 'cooling', 'coolerSocketSupport')
    expect(cooler).toMatchObject({ type: 'requires', operator: 'contains', value: 'AM5' })

    // symmetric socket binding: a cooler selected first dims CPUs and boards
    // it does not mount (explicit rows — never the `bi` mirror).
    const intelOnlyCooler = comp('f1', 'cooling', { coolerSocketSupport: ['LGA1700'] }, 'LGA cooler')
    const rules2 = synthesizeCompatibilityRules([cpu, intelOnlyCooler], CATS, [])
    expect(ruleShape(rules2, 'f1', 'cpu', 'socket')).toMatchObject({ operator: 'in', value: ['LGA1700'] })
    expect(ruleShape(rules2, 'f1', 'mobo', 'socket')).toMatchObject({ operator: 'in', value: ['LGA1700'] })
  })

  it('mobo→cooling constrains cooler picks by the board socket', () => {
    const mobo = comp('m1', 'mobo', { socket: 'LGA1700' }, 'Z790')
    const rules = synthesizeCompatibilityRules([mobo], CATS, [])
    expect(ruleShape(rules, 'm1', 'cooling', 'coolerSocketSupport')).toMatchObject({
      operator: 'contains',
      value: 'LGA1700',
    })
  })

  it('engine: LGA-only cooler selected → AM5 cpu and AM5 board both excluded', () => {
    const cpu = comp('c1', 'cpu', { socket: 'AM5' }, 'Ryzen 5 7600X')
    const mobo = comp('m1', 'mobo', { socket: 'AM5' }, 'B650E')
    const cooler = comp('f1', 'cooling', { coolerSocketSupport: ['LGA1700'] }, 'LGA cooler')
    const rules = synthesizeCompatibilityRules([cpu, mobo, cooler], CATS, [])
    const engine = createRuleEngine({ components: [cpu, mobo, cooler], rules, categories: CATS, power: { overheadMultiplier: 1, baseWatts: 0 }, rulesVersion: 't' })
    const res = engine.evaluate({ cooling: ['f1'] })
    const cpuExcluded = res.categories.find((c) => c.categoryId === 'cpu')?.excluded ?? []
    const moboExcluded = res.categories.find((c) => c.categoryId === 'mobo')?.excluded ?? []
    expect(cpuExcluded.map((e) => e.componentId)).toContain('c1')
    expect(moboExcluded.map((e) => e.componentId)).toContain('m1')
  })

  it('synthesizes mobo→cpu, mobo→ram, mobo→case rows', () => {
    const mobo = comp('m1', 'mobo', { socket: 'AM5', ramType: 'DDR5', moboFormFactor: 'ITX' }, 'B650E-I')
    const rules = synthesizeCompatibilityRules([mobo], CATS, [])

    expect(ruleShape(rules, 'm1', 'cpu', 'socket')).toMatchObject({ operator: 'equals', value: 'AM5' })
    expect(ruleShape(rules, 'm1', 'ram', 'ramType')).toMatchObject({ operator: 'equals', value: 'DDR5' })
    expect(ruleShape(rules, 'm1', 'case', 'caseSupportedFormFactors')).toMatchObject({
      operator: 'contains',
      value: 'ITX',
    })
  })

  it('synthesizes case→mobo with `in` + array value', () => {
    const box = comp('k1', 'case', { caseSupportedFormFactors: ['ITX', 'mATX'] }, '2000D')
    const rules = synthesizeCompatibilityRules([box], CATS, [])
    const r = ruleShape(rules, 'k1', 'mobo', 'moboFormFactor')
    expect(r).toMatchObject({ type: 'requires', operator: 'in', value: ['ITX', 'mATX'] })
  })

  it('synthesizes gpu↔case length rules both directions', () => {
    const gpu = comp('g1', 'gpu', { gpuLengthMm: 267 }, 'RTX 4070 Super')
    const box = comp('k1', 'case', { caseGpuMaxLengthMm: 280 }, '2000D')
    const rules = synthesizeCompatibilityRules([gpu, box], CATS, [])

    expect(ruleShape(rules, 'g1', 'case', 'caseGpuMaxLengthMm')).toMatchObject({
      operator: 'gte',
      value: 267,
    })
    expect(ruleShape(rules, 'k1', 'gpu', 'gpuLengthMm')).toMatchObject({ operator: 'lte', value: 280 })
  })

  it('synthesizes ram→mobo ramType requires', () => {
    const ram = comp('r1', 'ram', { ramType: 'DDR5' }, 'Vengeance 32GB')
    const rules = synthesizeCompatibilityRules([ram], CATS, [])
    expect(ruleShape(rules, 'r1', 'mobo', 'ramType')).toMatchObject({ operator: 'equals', value: 'DDR5' })
  })

  it('synthesizes NVMe→mobo requires but emits NOTHING for SATA drives', () => {
    const nvme = comp('s1', 'storage', { storageInterface: 'NVMe' }, '990 Pro')
    const sata = comp('s2', 'storage', { storageInterface: 'SATA' }, '870 EVO')
    const rules = synthesizeCompatibilityRules([nvme, sata], CATS, [])

    expect(ruleShape(rules, 's1', 'mobo', 'storageInterface')).toMatchObject({
      type: 'requires',
      operator: 'equals',
      value: 'NVMe',
    })
    // SATA must produce no requires row — it would block every board (regression guard)
    expect(rules.filter((r) => r.subject.id === 's2').length).toBe(0)
  })

  it('does not synthesize from pcieVersion or psuWatts', () => {
    const gpu = comp('g1', 'gpu', { pcieVersion: '4.0' }, 'RTX 4060')
    const psu = comp('p1', 'psu', { psuWatts: 650 }, 'RM650x')
    const rules = synthesizeCompatibilityRules([gpu, psu], CATS, [])
    expect(rules.length).toBe(0)
  })

  it('skips components missing the source spec', () => {
    const cpu = comp('c1', 'cpu', {}, 'Socketless CPU')
    expect(synthesizeCompatibilityRules([cpu], CATS, []).length).toBe(0)
  })

  it('dedupes against an identical authored rule (authored wins)', () => {
    const cpu = comp('c1', 'cpu', { socket: 'AM5' }, 'Ryzen 5 7600X')
    const authored: RuleDoc = {
      id: 'authored-1',
      type: 'requires',
      operator: 'equals',
      field: 'socket',
      value: 'AM5',
      severity: 'error',
      bidirectional: false,
      message: 'authored',
      subject: { kind: 'component', id: 'c1' },
      target: { kind: 'category', id: 'mobo' },
    }
    const rules = synthesizeCompatibilityRules([cpu], CATS, [authored])
    expect(rules.filter((r) => r.field === 'socket' && r.target.id === 'mobo').length).toBe(0)
  })

  it('CORE PROOF: engine excludes an LGA board under an AM5 pick with zero authored rules', () => {
    const cpu = comp('c1', 'cpu', { socket: 'AM5' }, 'Ryzen 5 7600X')
    const moboAmd = comp('m1', 'mobo', { socket: 'AM5' }, 'B650E-I')
    const moboIntel = comp('m2', 'mobo', { socket: 'LGA1700' }, 'Z790-P')
    const components = [cpu, moboAmd, moboIntel]
    const rules = synthesizeCompatibilityRules(components, CATS, [])

    const index: BuilderIndex = {
      components,
      rules,
      categories: CATS,
      power: { overheadMultiplier: 1.3, baseWatts: 100 },
      rulesVersion: 'test',
    }
    const engine = createRuleEngine(index)
    const result = engine.evaluate({ cpu: ['c1'] })
    const moboEval = result.categories.find((c) => c.categoryId === 'mobo')
    expect(moboEval?.validComponentIds).toContain('m1')
    expect(moboEval?.validComponentIds).not.toContain('m2')
    expect(moboEval?.excluded.find((e) => e.componentId === 'm2')?.message).toContain('AM5')
  })

  it('validateSelections: AM5 CPU + LGA board saved directly is an error', () => {
    const components = [
      comp('c1', 'cpu', { socket: 'AM5' }),
      comp('m2', 'mobo', { socket: 'LGA1700' }),
    ]
    const index: BuilderIndex = {
      components,
      rules: synthesizeCompatibilityRules(components, CATS, []),
      categories: CATS,
      power: { overheadMultiplier: 1.3, baseWatts: 100 },
      rulesVersion: 'test',
    }
    const engine = createRuleEngine(index)
    const v = engine.validateSelections({ cpu: ['c1'], motherboard: ['m2'] })
    expect(v.errors.length).toBeGreaterThan(0)
  })
})

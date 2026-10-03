import { describe, expect, it } from 'vitest'
import type { BuilderIndex, EngineResult } from '@buildmyrig/lib'
import { buildOptionRows } from './option-rows'

/**
 * Design kit #323+ — le righe per le UI di scelta componenti devono dare a
 * ogni design le stesse informazioni: selezione, esclusione, stock e delta
 * (single-select vs il pick corrente, multi-select additivo).
 */

const component = (
  id: string,
  categoryId: string,
  priceCents: number,
  tdpWatts?: number,
  inStock?: boolean,
): BuilderIndex['components'][number] => ({
  id,
  categoryId,
  priceCents,
  inStock,
  specs: tdpWatts === undefined ? {} : { tdpWatts },
  display: { name: `Part ${id}` },
})

const index: BuilderIndex = {
  components: [
    component('cpu-1', 'cat-cpu', 25000, 105),
    component('cpu-2', 'cat-cpu', 30000, 125),
    component('ram-1', 'cat-ram', 9000, 8, false),
    component('ram-2', 'cat-ram', 12000, 10),
  ],
  rules: [],
  categories: [
    { id: 'cat-cpu', slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 1 },
    { id: 'cat-ram', slug: 'ram', name: 'RAM', required: true, maxSelectable: 4, sortOrder: 2 },
  ],
  power: { overheadMultiplier: 1.3, baseWatts: 100 },
  rulesVersion: 'test',
}

const result = (excluded: EngineResult['categories'] = []): EngineResult => ({
  categories: excluded,
  warnings: [],
  recommendedPsuWatts: 350,
  powerWarnings: [],
})

describe('buildOptionRows', () => {
  it('#323 single-select: delta vs il primo pick corrente', () => {
    const rows = buildOptionRows(index, result(), 'cat-cpu', { 'cat-cpu': ['cpu-1'] })
    expect(rows).toHaveLength(2)
    const [r1, r2] = rows
    expect(r1.selected).toBe(true)
    expect(r1.deltaCents).toBe(0)
    expect(r1.deltaWatts).toBe(0)
    expect(r2.selected).toBe(false)
    expect(r2.deltaCents).toBe(5000)
    expect(r2.deltaWatts).toBe(20)
  })

  it('#324 single-select senza selezione: delta = valore del candidato', () => {
    const rows = buildOptionRows(index, result(), 'cat-cpu', {})
    expect(rows[0].deltaCents).toBe(25000)
    expect(rows[0].deltaWatts).toBe(105)
    expect(rows[1].deltaCents).toBe(30000)
  })

  it('#325 multi-select: delta additivo del candidato', () => {
    const rows = buildOptionRows(index, result(), 'cat-ram', { 'cat-ram': ['ram-2'] })
    expect(rows).toHaveLength(2)
    expect(rows[0].deltaCents).toBe(9000)
    expect(rows[0].deltaWatts).toBe(8)
    expect(rows[1].deltaCents).toBe(12000)
    expect(rows[1].deltaWatts).toBe(10)
    expect(rows[1].selected).toBe(true)
    expect(rows[0].selected).toBe(false)
  })

  it('#326 excludedReason passa il messaggio del motore', () => {
    const res = result([
      {
        categoryId: 'cat-cpu',
        validComponentIds: ['cpu-1'],
        excluded: [
          { componentId: 'cpu-2', ruleId: 'r1', severity: 'error', message: 'Socket diverso dalla scheda madre' },
        ],
      },
    ])
    const rows = buildOptionRows(index, res, 'cat-cpu', {})
    expect(rows[0].excludedReason).toBeNull()
    expect(rows[1].excludedReason).toBe('Socket diverso dalla scheda madre')
  })

  it('#327 inStock riflette il flag dell\'entry (assente = true)', () => {
    const rows = buildOptionRows(index, result(), 'cat-ram', {})
    expect(rows[0].inStock).toBe(false)
    expect(rows[1].inStock).toBe(true)
  })

  it('#328 categoria sconosciuta → []', () => {
    expect(buildOptionRows(index, result(), 'nope', {})).toEqual([])
  })
})

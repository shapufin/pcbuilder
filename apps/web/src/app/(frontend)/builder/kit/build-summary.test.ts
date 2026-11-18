import { describe, expect, it } from 'vitest'
import { summarizeBuild } from './build-summary'

/** Audit 2026-11-18 R3: SummaryClient's derivations (was inline, untested, O(n²) lookups). */
const index = {
  categories: [
    { id: 'c2', name: 'GPU', sortOrder: 2, required: false },
    { id: 'c1', name: 'CPU', sortOrder: 1, required: true },
    { id: 'c3', name: 'PSU', sortOrder: 3, required: true },
  ],
  components: [
    { id: 'p1', categoryId: 'c1', priceCents: 30000 },
    { id: 'p2', categoryId: 'c2', priceCents: 50000 },
  ],
} as never

describe('summarizeBuild (audit 2026-11-18 R3)', () => {
  it('#775 rows follow category sort order, total sums known parts, missing lists empty required slots', () => {
    const s = summarizeBuild(index, { c2: ['p2'], c1: ['p1', 'ghost'] })
    expect(s.rows.map((r) => r.category.id + ':' + (r.entry?.id ?? '?'))).toEqual(['c1:p1', 'c1:?', 'c2:p2'])
    expect(s.total).toBe(80000)
    expect(s.missing.map((c) => c.id)).toEqual(['c3'])
  })
  it('#776 no index → empty summary', () => {
    expect(summarizeBuild(null, { c1: ['p1'] })).toEqual({ categories: [], rows: [], total: 0, missing: [] })
  })
})

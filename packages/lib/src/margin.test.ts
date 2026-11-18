import { describe, expect, it } from 'vitest'
import { computeMargin } from './margin'

describe('computeMargin (#680)', () => {
  it('computes gross profit, margin % and discount % from cents', () => {
    // €1299 retail, €950 cost, €1599 MSRP
    const m = computeMargin({ priceCents: 129900, costCents: 95000, compareAtCents: 159900 })
    expect(m.hasCost).toBe(true)
    expect(m.grossProfitCents).toBe(34900)
    expect(m.marginPercent).toBeCloseTo(26.87, 1)
    expect(m.discountPercent).toBeCloseTo(18.76, 1)
    expect(m.warnings).toEqual([])
  })

  it('flags a negative margin when cost exceeds the retail price', () => {
    const m = computeMargin({ priceCents: 90000, costCents: 120000 })
    expect(m.grossProfitCents).toBe(-30000)
    expect(m.marginPercent).toBeCloseTo(-33.33, 1)
    expect(m.warnings).toContain('negative-margin')
  })

  it('reports missing cost instead of inventing a margin', () => {
    const m = computeMargin({ priceCents: 129900 })
    expect(m.hasCost).toBe(false)
    expect(m.grossProfitCents).toBeNull()
    expect(m.marginPercent).toBeNull()
    expect(m.warnings).toContain('no-cost')
  })

  it('ignores a compare-at price that is not above the retail price', () => {
    const atSame = computeMargin({ priceCents: 129900, costCents: 95000, compareAtCents: 129900 })
    expect(atSame.discountPercent).toBeNull()
    expect(atSame.warnings).toContain('msrp-not-above-price')

    const below = computeMargin({ priceCents: 129900, costCents: 95000, compareAtCents: 99900 })
    expect(below.discountPercent).toBeNull()
    expect(below.warnings).toContain('msrp-not-above-price')
  })

  it('never divides by zero on an unpriced draft', () => {
    const m = computeMargin({ priceCents: 0, costCents: 5000 })
    expect(m.marginPercent).toBeNull()
    expect(m.warnings).toContain('no-price')
  })

  it('treats non-finite and negative inputs as absent rather than NaN', () => {
    const m = computeMargin({
      priceCents: Number.NaN as unknown as number,
      costCents: -1,
      compareAtCents: Number.POSITIVE_INFINITY as unknown as number,
    })
    expect(m.grossProfitCents).toBeNull()
    expect(m.marginPercent).toBeNull()
    expect(m.discountPercent).toBeNull()
    expect(JSON.stringify(m)).not.toContain('null,null')
  })

  it('is exact at whole-euro boundaries (no float drift)', () => {
    const m = computeMargin({ priceCents: 10000, costCents: 7500 })
    expect(m.grossProfitCents).toBe(2500)
    expect(m.marginPercent).toBe(25)
  })
})


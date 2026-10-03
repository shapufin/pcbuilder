import { describe, it, expect } from 'vitest'
import {
  computeCartTotals,
  pickShippingBand,
  validateDiscount,
  type DiscountCodeDoc,
  type ShippingBand,
} from './pricing.ts'

const NOW = new Date('2026-10-02T12:00:00Z')

const code = (over: Partial<DiscountCodeDoc> = {}): DiscountCodeDoc => ({
  code: 'SAVE10',
  type: 'percentage',
  value: 10,
  enabled: true,
  usedCount: 0,
  ...over,
})

describe('validateDiscount — audit gap A6', () => {
  it('accepts a valid percentage code and computes the discount', () => {
    const r = validateDiscount(code(), 10_000, NOW)
    expect(r.valid).toBe(true)
    expect(r.discountTotal).toBe(1_000)
  })

  it('fixed discount clamps at subtotal (never negative)', () => {
    expect(validateDiscount(code({ type: 'fixed', value: 500 }), 300, NOW).discountTotal).toBe(300)
    expect(validateDiscount(code({ type: 'fixed', value: 500 }), 10_000, NOW).discountTotal).toBe(500)
  })

  it('freeShipping yields no subtotal discount but flags free shipping', () => {
    const r = validateDiscount(code({ type: 'freeShipping' }), 10_000, NOW)
    expect(r.valid).toBe(true)
    expect(r.discountTotal).toBe(0)
    expect(r.freeShipping).toBe(true)
  })

  it.each([
    ['disabled', code({ enabled: false })],
    ['not yet valid', code({ validFrom: '2026-10-03' })],
    ['expired', code({ validUntil: '2026-10-01' })],
    ['used up', code({ maxUses: 5, usedCount: 5 })],
    ['below minSubtotal', code({ minSubtotal: 50_000 })],
    ['percentage out of range', code({ value: 120 })],
  ])('rejects: %s', (_name, doc) => {
    const r = validateDiscount(doc, 10_000, NOW)
    expect(r.valid).toBe(false)
    expect(r.reason).toBeTruthy()
  })

  it('passes when maxUses not yet reached and dates bracket now', () => {
    const r = validateDiscount(
      code({ maxUses: 5, usedCount: 4, validFrom: '2026-10-01', validUntil: '2026-10-03' }),
      10_000,
      NOW,
    )
    expect(r.valid).toBe(true)
  })
})

describe('pickShippingBand — A18 flat bands', () => {
  const bands: ShippingBand[] = [
    { label: 'Standard', minSubtotal: 0, maxSubtotal: 50_00, price: 490, enabled: true },
    { label: 'Free', minSubtotal: 50_00, maxSubtotal: null, price: 0, enabled: true },
    { label: 'Disabled', minSubtotal: 0, maxSubtotal: 10_00, price: 999, enabled: false },
  ]

  it('picks the first enabled band whose range contains the amount', () => {
    expect(pickShippingBand(bands, 10_00)?.label).toBe('Standard')
    expect(pickShippingBand(bands, 60_00)?.label).toBe('Free')
    expect(pickShippingBand(bands, 50_00)?.label).toBe('Free') // boundary: max is exclusive
  })

  it('returns null when nothing matches', () => {
    expect(pickShippingBand(bands.filter((b) => b.label !== 'Free'), 60_00)).toBeNull()
    expect(pickShippingBand([], 10_00)).toBeNull()
  })
})

describe('computeCartTotals — VAT-inclusive prices (tax extracted, not added)', () => {
  const shippingBands: ShippingBand[] = [
    { label: 'Flat', minSubtotal: 0, maxSubtotal: null, price: 490, enabled: true },
  ]
  const taxRates = [{ country: 'default', rate: 20, enabled: true, isDefault: true }]

  it('no discount: total = subtotal + shipping; tax extracted from the total', () => {
    const t = computeCartTotals({ subtotal: 10_000, shippingBands, taxRates })
    expect(t.discountTotal).toBe(0)
    expect(t.shippingTotal).toBe(490)
    // 10490 gross incl. 20% VAT → 10490 * 20/120 = 1748
    expect(t.taxTotal).toBe(1748)
    expect(t.total).toBe(10_490)
  })

  it('percentage discount reduces subtotal before shipping/tax', () => {
    const t = computeCartTotals({
      subtotal: 10_000,
      discountCode: code({ value: 10 }),
      shippingBands,
      taxRates,
    })
    expect(t.discountTotal).toBe(1_000)
    expect(t.shippingTotal).toBe(490)
    expect(t.total).toBe(9_490)
    expect(t.taxTotal).toBe(Math.round((9_490 * 20) / 120))
  })

  it('freeShipping zeroes the shipping line', () => {
    const t = computeCartTotals({
      subtotal: 10_000,
      discountCode: code({ type: 'freeShipping' }),
      shippingBands,
      taxRates,
    })
    expect(t.shippingTotal).toBe(0)
    expect(t.total).toBe(10_000)
  })

  it('invalid/expired code is ignored (no discount applied)', () => {
    const t = computeCartTotals({
      subtotal: 10_000,
      discountCode: code({ enabled: false }),
      shippingBands,
      taxRates,
      now: NOW,
    })
    expect(t.discountTotal).toBe(0)
    expect(t.total).toBe(10_490)
  })

  it('no tax rates → taxTotal 0', () => {
    const t = computeCartTotals({ subtotal: 10_000, shippingBands, taxRates: [] })
    expect(t.taxTotal).toBe(0)
  })

  it('never produces a negative total', () => {
    const t = computeCartTotals({
      subtotal: 300,
      discountCode: code({ type: 'fixed', value: 9_999 }),
      shippingBands,
      taxRates,
    })
    expect(t.total).toBe(490) // only shipping remains
    expect(t.discountTotal).toBe(300)
  })
})

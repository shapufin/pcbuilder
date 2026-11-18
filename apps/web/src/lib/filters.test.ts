import { describe, it, expect } from 'vitest'
import { formatPrice } from './filters.ts'

/**
 * Audit round 2 (#710) — `formatPrice` collapsed "no price" into 0, so a
 * published product with a null price rendered €0.00 on its card and its PDP
 * (measured on /product/gaming-keyboard-rgb-pro: three €0.00 and an
 * Add-to-cart button). A price of 0 is a legitimate free item and must keep
 * rendering as €0.00, so the two cases have to be distinguished.
 */
describe('formatPrice (#710)', () => {
  it('#710 renders a placeholder when the price is missing, not €0.00', () => {
    expect(formatPrice({ priceInEUR: null })).toBe('Price on request')
    expect(formatPrice({})).toBe('Price on request')
  })

  it('still formats real prices, including a genuine zero', () => {
    expect(formatPrice({ priceInEUR: 12_345 })).toBe('€123.45')
    expect(formatPrice({ priceInEUR: 0 })).toBe('€0.00')
  })
})

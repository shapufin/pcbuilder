import { describe, expect, it } from 'vitest'
import { formatEUR } from './money'

describe('formatEUR', () => {
  it('formats cents as grouped euro', () => {
    expect(formatEUR(129900)).toBe('€1,299.00')
    expect(formatEUR(5)).toBe('€0.05')
    expect(formatEUR(0)).toBe('€0.00')
  })

  it('groups larger totals like the storefront Intl formatter', () => {
    expect(formatEUR(123456789)).toBe('€1,234,567.89')
  })

  it('treats null/undefined/NaN as zero (email templates stay null-safe)', () => {
    expect(formatEUR(null)).toBe('€0.00')
    expect(formatEUR(undefined)).toBe('€0.00')
    expect(formatEUR(Number.NaN)).toBe('€0.00')
  })
})

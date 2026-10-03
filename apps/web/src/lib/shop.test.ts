import { describe, expect, it } from 'vitest'
import { productFilters } from './filters'

// #156+ pass-1 audit: productFilters drives the category listing's
// URL-sharable filters — pinning the sort map + param handling.
describe('productFilters — pass-1 audit', () => {
  it('#183 maps sort params; unknown/empty falls back to price ascending', () => {
    expect(productFilters({ sort: 'price_desc' }).sort).toBe('-priceInEUR')
    expect(productFilters({ sort: 'title' }).sort).toBe('title')
    expect(productFilters({ sort: 'newest' }).sort).toBe('-createdAt')
    expect(productFilters({ sort: 'bogus' }).sort).toBe('priceInEUR')
    expect(productFilters({}).sort).toBe('priceInEUR')
  })

  it('#184 brand + price bounds land in the where clause; arrays take first value', () => {
    const { and } = productFilters({
      brand: ['intel', 'amd'],
      price_gte: '10000',
      price_lte: '30000',
    })
    expect(and).toEqual([
      { 'brand.slug': { equals: 'intel' } },
      { priceInEUR: { gte: 10000 } },
      { priceInEUR: { lte: 30000 } },
    ])
  })

  it('#185 page parses; missing/garbage page -> 1', () => {
    expect(productFilters({ page: '3' }).page).toBe(3)
    expect(productFilters({ page: 'abc' }).page).toBe(1)
    expect(productFilters({}).page).toBe(1)
  })

  it('#285 page clamps: negative/float -> sane integer; non-numeric prices are dropped', () => {
    expect(productFilters({ page: '-5' }).page).toBe(1)
    expect(productFilters({ page: '2.9' }).page).toBe(2)
    expect(productFilters({ page: '0' }).page).toBe(1)
    const { and } = productFilters({ price_gte: 'abc', price_lte: '' })
    expect(and).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { aggregateRating, crossSellIds, pickerVariants, productBadge, reviewItems, variantsInStock } from './pdp'

/** Audit 2026-11-18 R2: ProductPage (CC 36, untested) derivations as pure helpers. */
describe('PDP helpers (audit 2026-11-18 R2)', () => {
  it('#770 crossSellIds accepts populated docs and raw ids, drops junk', () => {
    expect(crossSellIds({ crossSells: [{ id: 3 }, 4, null, 'x', { id: 'y' }] })).toEqual([3, 4])
    expect(crossSellIds({})).toEqual([])
  })

  it('#771 variantsInStock: no variants or untracked inventory counts as in stock', () => {
    expect(variantsInStock([])).toBe(true)
    expect(variantsInStock([{ inventory: 0 }, { inventory: null }])).toBe(true)
    expect(variantsInStock([{ inventory: 0 }, { inventory: 0 }])).toBe(false)
  })

  it('#772 pickerVariants labels by option labels, then title, then Standard', () => {
    expect(
      pickerVariants([
        { id: 1, options: [{ label: '32GB' }, { label: 'Black' }], priceInEUR: 100, inventory: 2 },
        { id: 2, title: 'Founders' },
        { id: 3 },
      ]).map((v) => v.label),
    ).toEqual(['32GB / Black', 'Founders', 'Standard'])
  })

  it('#773 reviews: disabled → none; defaults filled; rating is the mean', () => {
    const docs = [{ id: 1, rating: 4, verifiedPurchase: true, createdAt: '2026-01-01' }, { id: 2, rating: 2 }]
    expect(reviewItems(docs, false)).toEqual([])
    const items = reviewItems(docs, true)
    expect(items[0]).toMatchObject({ rating: 4, isVerifiedBuyer: true, authorName: 'Verified Builder' })
    expect(aggregateRating(items)).toEqual({ ratingValue: 3, reviewCount: 2 })
    expect(aggregateRating([])).toBeNull()
  })

  it('#774 productBadge maps presets, trims custom text, ignores none/blank', () => {
    expect(productBadge('hot')).toEqual({ label: 'HOT', type: 'hot' })
    expect(productBadge('custom', '  Limited  ')).toEqual({ label: 'Limited', type: 'custom' })
    expect(productBadge('custom', '  ')).toBeNull()
    expect(productBadge('none')).toBeNull()
    expect(productBadge(undefined)).toBeNull()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { useWishlist, MAX_WISHLIST_ITEMS, type WishlistItem } from './wishlist-store'

const item = (n: number): WishlistItem => ({
  id: `p${n}`,
  slug: `product-${n}`,
  title: `Product ${n}`,
  priceText: `EUR ${n}0.00`,
})

/**
 * Step A (entry 18) - wishlist is localStorage-first (07-ux-plan: CSR,
 * local-first; server persistence is a later phase). Store logic only:
 * dedupe on add, toggle semantics, bounded size (localStorage is small and
 * the UI shows a badge count).
 */
describe('wishlist store', () => {
  beforeEach(() => {
    useWishlist.setState({ items: [] })
  })

  it('#108 add is idempotent by id, newest first', () => {
    useWishlist.getState().add(item(1))
    useWishlist.getState().add(item(2))
    useWishlist.getState().add(item(1))
    expect(useWishlist.getState().items.map((i) => i.id)).toEqual(['p2', 'p1'])
  })

  it('#109 remove and toggle', () => {
    useWishlist.getState().add(item(1))
    useWishlist.getState().remove('p1')
    expect(useWishlist.getState().items).toEqual([])

    useWishlist.getState().toggle(item(5))
    expect(useWishlist.getState().items.map((i) => i.id)).toEqual(['p5'])
    useWishlist.getState().toggle(item(5))
    expect(useWishlist.getState().items).toEqual([])
  })

  it('#110 bounded at MAX_WISHLIST_ITEMS - oldest evicted, newest-first order', () => {
    for (let n = 1; n <= MAX_WISHLIST_ITEMS + 3; n++) useWishlist.getState().add(item(n))
    const items = useWishlist.getState().items
    expect(items).toHaveLength(MAX_WISHLIST_ITEMS)
    expect(items[0]!.id).toBe(`p${MAX_WISHLIST_ITEMS + 3}`)
    expect(items[items.length - 1]!.id).toBe('p4')
  })
})

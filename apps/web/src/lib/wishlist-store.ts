import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Step A (entry 18) — wishlist is localStorage-first (07-ux-plan: CSR,
 * local-first; syncing to the user doc is a later phase). Snapshots the
 * product row (title/price) so the list renders with no server round-trip;
 * the product link is the source of truth for current price/stock.
 */
export type WishlistItem = {
  id: string
  slug: string
  title: string
  priceText: string
}

export const MAX_WISHLIST_ITEMS = 50

interface WishlistState {
  items: WishlistItem[]
  add: (item: WishlistItem) => void
  remove: (id: string) => void
  toggle: (item: WishlistItem) => void
}

const addNewest = (items: WishlistItem[], item: WishlistItem): WishlistItem[] => {
  if (items.some((i) => i.id === item.id)) return items // idempotent: keep position
  const next = [item, ...items]
  return next.length > MAX_WISHLIST_ITEMS ? next.slice(0, MAX_WISHLIST_ITEMS) : next
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: addNewest(s.items, item) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.id === item.id)
            ? { items: s.items.filter((i) => i.id !== item.id) }
            : { items: addNewest(s.items, item) },
        ),
    }),
    {
      name: 'bmr-wishlist-v1',
      // SSR: the store must render empty on the server and on the first
      // client frame; consumers call useWishlistHydration() in an effect so
      // persisted items land after hydration (no mismatch warnings).
      skipHydration: true,
    },
  ),
)

/** Rehydrate persisted wishlist items after mount (call once per consumer). */
export function useWishlistHydration(): void {
  useEffect(() => {
    void useWishlist.persist.rehydrate()
  }, [])
}

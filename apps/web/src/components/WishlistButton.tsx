'use client'

import { Heart } from 'lucide-react'
import { useWishlist, useWishlistHydration, type WishlistItem } from '@/lib/wishlist-store'

/** Product page heart toggle (localStorage-first wishlist, entry 18 Step A). */
export function WishlistButton({ item }: { item: WishlistItem }) {
  useWishlistHydration()
  const saved = useWishlist((s) => s.items.some((i) => i.id === item.id))
  const toggle = useWishlist((s) => s.toggle)
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => toggle(item)}
      className={`btn btn--secondary btn--full wishlist-toggle${saved ? ' wishlist-toggle--saved' : ''}`}
    >
      {saved ? (
        <>
          <Heart size={15} aria-hidden fill="currentColor" /> Saved to wishlist
        </>
      ) : (
        <>
          <Heart size={15} aria-hidden /> Save to wishlist
        </>
      )}
    </button>
  )
}

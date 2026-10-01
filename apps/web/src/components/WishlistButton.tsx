'use client'

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
      style={{
        display: 'block',
        width: '100%',
        marginTop: 10,
        padding: '10px 16px',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: saved ? 'var(--color-primary-hover)' : 'var(--color-text)',
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {saved ? '♥ Saved to wishlist' : '♡ Save to wishlist'}
    </button>
  )
}

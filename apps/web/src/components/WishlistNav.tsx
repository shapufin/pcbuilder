'use client'

import Link from 'next/link'
import { useWishlist, useWishlistHydration } from '@/lib/wishlist-store'

/** Header wishlist link with a count badge (hidden while the list is empty). */
export function WishlistNav() {
  useWishlistHydration()
  const count = useWishlist((s) => s.items.length)
  return (
    <Link
      href="/wishlist"
      aria-label={count > 0 ? `Wishlist, ${count} item${count === 1 ? '' : 's'}` : 'Wishlist'}
      style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
    >
      Wishlist
      {count > 0 ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 999,
            background: 'var(--color-primary-strong)',
            color: 'var(--color-on-primary)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      ) : null}
    </Link>
  )
}

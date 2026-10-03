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
    >
      Wishlist
      {count > 0 ? <span className="nav-badge">{count}</span> : null}
    </Link>
  )
}

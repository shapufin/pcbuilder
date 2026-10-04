'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'

type MinimalCart = { items?: { quantity?: number | null }[] | null }

/**
 * Header cart count with the §4 "badge pop" (150ms) whenever the count changes.
 * CSS keyframes, not framer-motion (entry 64): the badge is in the site-wide
 * header, so a motion import here put a ~57 KB chunk on every page's critical
 * path. `key` remounts the span on a count change, replaying the animation;
 * reduced motion is handled by the media query in shell.css.
 */
export function CartBadge() {
  const { cart } = useCart() as { cart?: MinimalCart }
  const items = cart?.items ?? []
  const count = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  if (count === 0) return null

  return (
    <span key={count} className="nav-badge nav-badge--pop">
      {count}
    </span>
  )
}

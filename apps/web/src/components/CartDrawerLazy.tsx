'use client'

import dynamic from 'next/dynamic'

/**
 * Deferred cart drawer (entry 64). CartDrawer pulls framer-motion (~57 KB
 * chunk) and the drawer only exists once the visitor adds something — so the
 * site-wide layout mounts it through `ssr: false` dynamic import instead of
 * shipping motion + drawer markup on every page's critical path. Safe because
 * the drawer gates on the zustand store: an `open()` that fires before the
 * chunk lands is picked up on mount.
 */
const CartDrawer = dynamic(() => import('./CartDrawer').then((m) => m.CartDrawer), {
  ssr: false,
})

export function CartDrawerLazy() {
  return <CartDrawer />
}

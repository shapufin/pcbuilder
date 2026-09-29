'use client'

import { motion } from 'framer-motion'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'

type MinimalCart = { items?: { quantity?: number | null }[] | null }

/**
 * Header cart count with the §4 "badge pop" (150ms) whenever the count changes.
 */
export function CartBadge() {
  const { cart } = useCart() as { cart?: MinimalCart }
  const items = cart?.items ?? []
  const count = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  if (count === 0) return null

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <motion.span
      key={count}
      initial={reduced ? false : { scale: 0.5 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 18, duration: 0.15 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        padding: '0 6px',
        borderRadius: 999,
        background: '#6366f1',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        marginLeft: 6,
      }}
    >
      {count}
    </motion.span>
  )
}

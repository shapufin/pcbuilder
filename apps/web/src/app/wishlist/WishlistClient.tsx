'use client'

import Link from 'next/link'
import { useWishlist, useWishlistHydration } from '@/lib/wishlist-store'

export function WishlistClient() {
  useWishlistHydration()
  const items = useWishlist((s) => s.items)
  const remove = useWishlist((s) => s.remove)

  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-muted)' }}>
        Nothing saved yet — browse the{' '}
        <Link href="/shop" style={{ color: 'var(--color-primary-hover)' }}>
          shop
        </Link>{' '}
        and hit “Save to wishlist” on a product.
      </p>
    )
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
      {items.map((item) => (
        <li
          key={item.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
            padding: '12px 16px',
            border: '1px solid var(--color-surface)',
            borderRadius: 10,
            background: 'var(--color-bg)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Link href={`/product/${item.slug}`} style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              {item.title}
            </Link>
            <div style={{ color: 'var(--color-primary-hover)', fontSize: 13, marginTop: 2 }}>{item.priceText}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <Link href={`/product/${item.slug}`} style={{ color: 'var(--color-primary-hover)', fontSize: 14 }}>
              View
            </Link>
            <button
              type="button"
              onClick={() => remove(item.id)}
              style={{
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

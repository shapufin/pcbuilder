'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWishlist, useWishlistHydration } from '@/lib/wishlist-store'

export function WishlistClient() {
  useWishlistHydration()
  const items = useWishlist((s) => s.items)
  const remove = useWishlist((s) => s.remove)
  // C5: saved snapshots outlive their products — ask which ids still resolve
  // and mark the rest instead of rendering dead links.
  const [staleIds, setStaleIds] = useState<string[]>([])
  const idKey = items.map((i) => i.id).join(',')

  useEffect(() => {
    // No ids → nothing to check. (No sync setState here: the empty branch in
    // render already covers it, and the repo lint forbids cascading renders.)
    if (!idKey) return
    let cancelled = false
    const ids = idKey.split(',')
    fetch('/api/wishlist/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(async (res) => (res.ok ? ((await res.json()) as { stale?: string[] }) : null))
      .then((data) => {
        if (!cancelled && data?.stale) setStaleIds(data.stale)
      })
      .catch(() => {
        // A failed check must not hide items — leave them as saved.
      })
    return () => {
      cancelled = true
    }
  }, [idKey])

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

  const staleCount = items.filter((i) => staleIds.includes(i.id)).length

  return (
    <>
      {staleCount > 0 && (
        <div
          role="status"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--color-warning)',
            color: 'var(--color-warning)',
            fontSize: 14,
          }}
        >
          <span>
            {staleCount === 1 ? '1 saved item is' : `${staleCount} saved items are`} no longer available.
          </span>
          <button
            type="button"
            onClick={() => items.filter((i) => staleIds.includes(i.id)).forEach((i) => remove(i.id))}
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
            Remove unavailable
          </button>
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
        {items.map((item) => {
          const stale = staleIds.includes(item.id)
          return (
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
                opacity: stale ? 0.6 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                {stale ? (
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 15 }}>{item.title}</span>
                ) : (
                  <Link href={`/product/${item.slug}`} style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                    {item.title}
                  </Link>
                )}
                <div style={{ color: stale ? 'var(--color-text-muted)' : 'var(--color-primary-hover)', fontSize: 13, marginTop: 2 }}>
                  {stale ? 'No longer available' : item.priceText}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                {!stale && (
                  <Link href={`/product/${item.slug}`} style={{ color: 'var(--color-primary-hover)', fontSize: 14 }}>
                    View
                  </Link>
                )}
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
          )
        })}
      </ul>
    </>
  )
}

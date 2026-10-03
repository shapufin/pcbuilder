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
      <div className="empty-state">
        <p className="empty-state__title">Nothing saved yet</p>
        <p className="empty-state__desc">Browse the shop and hit “Save to wishlist” on a product.</p>
        <Link href="/shop" className="btn btn--primary">
          Browse the shop
        </Link>
      </div>
    )
  }

  const staleCount = items.filter((i) => staleIds.includes(i.id)).length

  return (
    <>
      {staleCount > 0 && (
        <div role="status" className="wishlist-stale">
          <span>
            {staleCount === 1 ? '1 saved item is' : `${staleCount} saved items are`} no longer available.
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => items.filter((i) => staleIds.includes(i.id)).forEach((i) => remove(i.id))}
          >
            Remove unavailable
          </button>
        </div>
      )}
      <ul className="list">
        {items.map((item) => {
          const stale = staleIds.includes(item.id)
          return (
            <li key={item.id} className={`list-card${stale ? ' list-card--stale' : ''}`}>
              <div>
                {stale ? (
                  <span className="list-card__title list-card__title--stale">{item.title}</span>
                ) : (
                  <Link href={`/product/${item.slug}`} className="list-card__title">
                    {item.title}
                  </Link>
                )}
                <div className="list-card__meta">
                  {stale ? 'No longer available' : item.priceText}
                </div>
              </div>
              <div className="list-card__actions">
                {!stale && (
                  <Link href={`/product/${item.slug}`} className="btn btn--secondary btn--sm">
                    View
                  </Link>
                )}
                <button type="button" onClick={() => remove(item.id)} className="btn btn--ghost btn--sm">
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

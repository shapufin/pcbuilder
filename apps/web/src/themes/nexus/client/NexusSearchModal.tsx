'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Price } from '@/components/ui/Price'
import { playTickSound } from '../lib/audio'

type SearchHit = {
  id: number | string
  title?: string
  slug?: string
  priceInEUR?: number | null
  category?: { title?: string } | number | string | null
}

/**
 * ⌘K search modal (entry 71) — hits the real products REST endpoint
 * (published-only via the plugin's adminOrPublishedStatus read access) with
 * a 250ms debounce. Results link to real /product/[slug] routes; the footer
 * link goes to the existing /shop/search?q= page. Escape/backdrop close.
 *
 * The dialog is a fresh component per open (conditional mount), so query/
 * results reset naturally — no state reset inside effects (react-hooks
 * set-state-in-effect). `loading` is derived: a trimmed query ≥2 chars is
 * "loading" until `fetched.q` matches it.
 */
function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [fetched, setFetched] = useState<{ q: string; hits: SearchHit[] }>({ q: '', hits: [] })
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqSeq = useRef(0)

  const q = query.trim()
  const hits = q === fetched.q ? fetched.hits : []
  const loading = q.length >= 2 && q !== fetched.q

  useEffect(() => {
    // Focus on mount — external-system effect only, no state writes.
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const trimmed = query.trim()
    const seq = ++reqSeq.current
    if (trimmed.length < 2) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const where = encodeURIComponent(JSON.stringify({ title: { contains: trimmed } }))
        const res = await fetch(`/api/products?where=${where}&limit=8&depth=1`)
        const data = res.ok ? ((await res.json()) as { docs?: SearchHit[] }) : null
        // Only the newest request may write — an out-of-order resolve would
        // otherwise leave fetched.q behind the input ("Searching…" forever).
        if (seq === reqSeq.current)
          setFetched({ q: trimmed, hits: Array.isArray(data?.docs) ? data.docs : [] })
      } catch {
        if (seq === reqSeq.current) setFetched({ q: trimmed, hits: [] })
      }
    }, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query])

  const categoryTitle = (c: SearchHit['category']): string =>
    c && typeof c === 'object' && c.title ? c.title : ''

  return (
    <div className="nx-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="nx-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Product search"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="nx-search-modal__bar">
          <Search size={16} className="nx-accent" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search silicon, GPUs, cooling loops…"
            aria-label="Search products"
            className="nx-search-modal__input"
          />
          <button type="button" className="nx-icon-btn" onClick={onClose} aria-label="Close search">
            <X size={15} />
          </button>
        </div>
        <div className="nx-search-modal__body">
          {q.length < 2 ? (
            <p className="nx-search-modal__hint">Type at least 2 characters — e.g. “RTX”, “DDR5”, “AM5”.</p>
          ) : loading ? (
            <p className="nx-search-modal__hint">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="nx-search-modal__hint">No matches — try the full catalog search.</p>
          ) : (
            <ul className="nx-search-modal__results">
              {hits.map((p) => (
                <li key={String(p.id)}>
                  <Link
                    href={`/product/${p.slug ?? p.id}`}
                    className="nx-search-modal__hit"
                    onClick={() => {
                      playTickSound()
                      onClose()
                    }}
                  >
                    <span className="nx-search-modal__hit-title">{p.title ?? 'Product'}</span>
                    {categoryTitle(p.category) && (
                      <span className="nx-search-modal__hit-cat">{categoryTitle(p.category)}</span>
                    )}
                    {typeof p.priceInEUR === 'number' && (
                      <span className="nx-search-modal__hit-price">
                        <Price cents={p.priceInEUR} />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="nx-search-modal__footer">
          <Link
            href={`/shop/search?q=${encodeURIComponent(q)}`}
            className="nx-search-modal__all"
            onClick={onClose}
          >
            Open full catalog search →
          </Link>
        </div>
      </div>
    </div>
  )
}

export function NexusSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <SearchDialog onClose={onClose} />
}

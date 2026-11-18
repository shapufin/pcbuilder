'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Price } from '@/components/ui/Price'

type SearchHit = {
  id: number | string
  title?: string
  slug?: string
  priceInEUR?: number | null
  category?: { title?: string } | number | string | null
}

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
        if (!res.ok) return
        const data = await res.json()
        if (seq === reqSeq.current) {
          setFetched({ q: trimmed, hits: data.docs ?? [] })
        }
      } catch {
        // network failure, stay quiet
      }
    }, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search hardware catalog"
      className="ae-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="ae-search-modal">
        <div className="ae-search-modal__bar">
          <Search className="ae-search-x-1" size={18} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search high-compute hardware, GPUs, loops..."
            className="ae-search-modal__input"
          />
          {loading ? (
            <span className="ae-search-modal__hint ae-search-x-2">
              Telemetry searching...
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="ae-cart-btn"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        <div className="ae-search-modal__body">
          {hits.length > 0 ? (
            <ul className="ae-search-modal__results">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={`/product/${hit.slug}`}
                    onClick={onClose}
                    className="ae-search-modal__hit"
                  >
                    <div>
                      <div className="ae-search-modal__hit-title">{hit.title}</div>
                      {typeof hit.category === 'object' && hit.category?.title ? (
                        <div className="ae-search-modal__hit-cat">{hit.category.title}</div>
                      ) : null}
                    </div>
                    {typeof hit.priceInEUR === 'number' ? (
                      <span className="ae-search-modal__hit-price">
                        <Price cents={hit.priceInEUR} />
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : q.length >= 2 && !loading ? (
            <p className="ae-search-modal__hint">No telemetry hardware found for &quot;{q}&quot;.</p>
          ) : (
            <p className="ae-search-modal__hint">
              Type at least 2 characters to search GPU, CPU, waterblock, and workstation catalog.
            </p>
          )}
        </div>

        {q.length >= 2 ? (
          <div className="ae-search-modal__footer">
            <Link
              href={`/shop/search?q=${encodeURIComponent(q)}`}
              onClick={onClose}
              className="ae-search-modal__all"
            >
              View all results for &quot;{q}&quot; &rarr;
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AetherSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null
  return <SearchDialog onClose={onClose} />
}

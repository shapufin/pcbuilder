import Link from 'next/link'
import type { CSSProperties } from 'react'
import { formatPrice } from '@/lib/shop'
import { mediaDoc, pickMedia } from '@/lib/media'
import './product-card.css'

export type CardProduct = {
  id: number | string
  title: string
  slug: string
  priceInEUR?: number | null
  brand?: { name?: string | null } | number | null
  gallery?: unknown[] | null
}

/**
 * Shared storefront product card — shop grids, search results, category
 * listings and the CMS ProductGrid block all render this. `priority` lifts
 * loading on above-the-fold cards (LCP); everything else lazy-loads.
 */
export function ProductCard({ product, priority = false }: { product: CardProduct; priority?: boolean }) {
  const firstMedia = Array.isArray(product.gallery) ? mediaDoc(product.gallery[0]) : null
  const img = pickMedia(firstMedia, 'card', product.title)
  const brand = product.brand && typeof product.brand === 'object' ? product.brand.name : null

  return (
    <Link href={`/product/${product.slug}`} className="product-card">
      <span className="product-card__media">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.url}
            alt={img.alt}
            width={img.width}
            height={img.height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <span className="product-card__placeholder" aria-hidden="true" />
        )}
      </span>
      <span className="product-card__body">
        {brand ? <span className="product-card__brand">{brand}</span> : null}
        <span className="product-card__title">{product.title}</span>
        <span className="product-card__price">{formatPrice(product)}</span>
      </span>
    </Link>
  )
}

/** Responsive grid wrapper — `--card-cols` overrides the desktop column count. */
export function ProductCardGrid({ cols, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div
      className="product-grid"
      style={cols ? ({ '--card-cols': cols } as CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}

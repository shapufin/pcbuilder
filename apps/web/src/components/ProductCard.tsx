import Link from 'next/link'
import type { CSSProperties } from 'react'
import { formatEUR } from '@/components/ui/Price'
import { formatPrice } from '@/lib/shop'
import { mediaDoc, pickMedia } from '@/lib/media'
import './product-card.css'

export type CardProduct = {
  id: number | string
  title: string
  slug: string
  priceInEUR?: number | null
  compareAtPriceInEUR?: number | null
  brand?: { name?: string | null } | number | null
  gallery?: unknown[] | null
  badgeType?: 'none' | 'hot' | 'new' | 'sale' | 'bestseller' | 'custom' | null
  customBadgeText?: string | null
}

const resolveBadge = (product: CardProduct): { label: string; type: string } | null => {
  if (!product.badgeType || product.badgeType === 'none') return null
  switch (product.badgeType) {
    case 'hot':
      return { label: '🔥 HOT', type: 'hot' }
    case 'new':
      return { label: '✨ NEW', type: 'new' }
    case 'sale':
      return { label: '⚡ SALE', type: 'sale' }
    case 'bestseller':
      return { label: '⭐ BESTSELLER', type: 'bestseller' }
    case 'custom':
      return product.customBadgeText?.trim() ? { label: product.customBadgeText.trim(), type: 'custom' } : null
    default:
      return null
  }
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
  const badge = resolveBadge(product)

  return (
    <Link href={`/product/${product.slug}`} className="product-card">
      <span className="product-card__media">
        {badge ? (
          <span className={`product-card__badge product-card__badge--${badge.type}`}>
            {badge.label}
          </span>
        ) : null}
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
        <span className="product-card__price-row">
          <span className="product-card__price">{formatPrice(product)}</span>
          {typeof product.compareAtPriceInEUR === 'number' &&
            typeof product.priceInEUR === 'number' &&
            product.compareAtPriceInEUR > product.priceInEUR && (
              <>
                <span className="product-card__compare-at">
                  {formatEUR(product.compareAtPriceInEUR)}
                </span>
                <span className="product-card__savings-badge">
                  -{Math.round(((product.compareAtPriceInEUR - product.priceInEUR) / product.compareAtPriceInEUR) * 100)}%
                </span>
              </>
            )}
        </span>
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

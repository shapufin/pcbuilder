'use client'

import { useState } from 'react'
import { formatEUR } from '@/components/ui/Price'
import { AddToCartButton } from './AddToCartButton'

export type PickerVariant = {
  id: number | string
  label: string
  priceInEUR?: number | null
  inventory?: number | null
}

/**
 * Variant selection + purchase action. With ≤1 variant the picker UI is
 * skipped entirely (the common case: every product has a default variant) —
 * this component still owns price/stock display so a multi-variant product
 * updates them on selection.
 */
export function VariantPicker({
  productId,
  productTitle,
  fallbackPriceCents,
  variants,
}: {
  productId: number | string
  productTitle: string
  fallbackPriceCents: number
  variants: PickerVariant[]
}) {
  const [index, setIndex] = useState(0)
  const variant = variants[index] ?? variants[0]
  const priceCents = variant?.priceInEUR ?? fallbackPriceCents
  const inStock = variant == null || variant.inventory == null || variant.inventory > 0

  return (
    <>
      {variants.length > 1 ? (
        <fieldset className="variant-picker">
          <legend className="variant-picker__legend">Model</legend>
          <div className="variant-picker__options">
            {variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={i === index}
                className={`variant-picker__option${i === index ? ' variant-picker__option--active' : ''}`}
                onClick={() => setIndex(i)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <p className="buy-box__price">{formatEUR(priceCents)}</p>
      <p className={`buy-box__stock${inStock ? '' : ' buy-box__stock--out'}`}>
        {inStock ? 'In stock' : 'Out of stock'}
      </p>
      <AddToCartButton productId={productId} variantId={variant?.id} label={productTitle} />
    </>
  )
}

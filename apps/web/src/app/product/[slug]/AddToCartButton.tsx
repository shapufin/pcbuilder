'use client'

import { useState } from 'react'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { flyToCart } from '@/lib/fly-to-cart'
import { track } from '@/lib/analytics'
import { useCartDrawerStore } from '@/lib/cart-drawer-store'

export function AddToCartButton({
  productId,
  variantId,
  label,
  disabled,
}: {
  productId: number | string
  variantId?: number | string
  label?: string
  disabled?: boolean
}) {
  const { addItem } = useEcommerce()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const openCartDrawer = useCartDrawerStore((s) => s.open)

  const onAdd = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setState('busy')
    try {
      await addItem(
        variantId
          ? { product: productId as never, variant: variantId as never }
          : { product: productId as never },
        1,
      )
      flyToCart(rect, label ?? 'Added')
      track('Add to Cart', label ? { item: label } : undefined)
      openCartDrawer()
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled || state === 'busy'}
      className={`btn btn--full ${state === 'done' ? 'btn--success' : 'btn--primary'}`}
    >
      {disabled
        ? 'Out of stock'
        : state === 'busy'
          ? 'Adding…'
          : state === 'done'
            ? 'Added to cart ✓'
            : state === 'error'
              ? 'Failed — retry'
              : 'Add to cart'}
    </button>
  )
}

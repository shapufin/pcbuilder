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
}: {
  productId: number | string
  variantId?: number | string
  label?: string
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
      onClick={onAdd}
      disabled={state === 'busy'}
      style={{
        width: '100%',
        padding: '12px 0',
        borderRadius: 8,
        border: 'none',
        background: state === 'done' ? 'var(--color-success-strong)' : 'var(--color-primary-strong)',
        color: 'var(--color-on-primary)',
        fontWeight: 600,
        cursor: state === 'busy' ? 'wait' : 'pointer',
      }}
    >
      {state === 'busy' ? 'Adding…' : state === 'done' ? 'Added to cart ✓' : state === 'error' ? 'Failed — retry' : 'Add to cart'}
    </button>
  )
}

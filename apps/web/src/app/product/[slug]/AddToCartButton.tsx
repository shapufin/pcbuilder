'use client'

import { useState } from 'react'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

export function AddToCartButton({ productId, variantId }: { productId: number | string; variantId?: number | string }) {
  const { addItem } = useEcommerce()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  const onAdd = async () => {
    setState('busy')
    try {
      await addItem(
        variantId
          ? { product: productId as never, variant: variantId as never }
          : { product: productId as never },
        1,
      )
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
        background: state === 'done' ? '#059669' : '#4f46e5',
        color: '#fff',
        fontWeight: 600,
        cursor: state === 'busy' ? 'wait' : 'pointer',
      }}
    >
      {state === 'busy' ? 'Adding…' : state === 'done' ? 'Added to cart ✓' : state === 'error' ? 'Failed — retry' : 'Add to cart'}
    </button>
  )
}

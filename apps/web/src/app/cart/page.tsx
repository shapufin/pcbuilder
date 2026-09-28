'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

type Item = {
  id: string
  quantity: number
  product?: { id: number | string; title?: string; prices?: { priceInEUR?: number } | null } | number | string
}

export default function CartPage() {
  const { cartID, refreshCart, removeItem, incrementItem, decrementItem, cart, isLoading } = useEcommerce()
  const [items, setItems] = useState<Item[]>([])
  const [subtotal, setSubtotal] = useState(0)

  useEffect(() => {
    if (cartID) void refreshCart()
  }, [cartID, refreshCart])

  useEffect(() => {
    const raw = cart as { items?: Item[]; subtotal?: number } | undefined
    setItems(raw?.items ?? [])
    setSubtotal(raw?.subtotal ?? 0)
  }, [cart])

  const titleOf = (item: Item): string =>
    typeof item.product === 'object' && item.product ? (item.product.title ?? 'Product') : 'Product'

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Cart</h1>
      {!cartID || (items.length === 0 && !isLoading) ? (
        <p style={{ color: '#64748b' }}>
          Your cart is empty. <Link href="/" style={{ color: '#818cf8' }}>Browse products</Link>.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #1e293b', borderRadius: 12, padding: 16, background: '#0f172a' }}
              >
                <div style={{ flex: 1 }}>
                  <strong>{titleOf(item)}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>Qty {item.quantity}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => void decrementItem(item.id)} style={qtyBtn}>−</button>
                  <button onClick={() => void incrementItem(item.id)} style={qtyBtn}>+</button>
                </div>
                <button onClick={() => void removeItem(item.id)} style={{ ...qtyBtn, color: '#f87171' }}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>Subtotal: €{(subtotal / 100).toFixed(2)}</span>
            <Link href="/checkout" style={checkoutBtn}>Checkout</Link>
          </div>
        </>
      )}
    </main>
  )
}

const qtyBtn = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid #334155',
  background: '#1e293b', color: '#e2e8f0', cursor: 'pointer',
} as const
const checkoutBtn = {
  padding: '12px 32px', borderRadius: 8, background: '#4f46e5', color: '#fff',
  fontWeight: 600, textDecoration: 'none',
} as const

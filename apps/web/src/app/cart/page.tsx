'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

type SubItem = {
  component?: string | { id?: string | number; name?: string }
  quantity?: number
  name?: string
}

type Item = {
  id: string
  quantity: number
  product?: { id: number | string; title?: string } | number | string
  lineType?: string
  configuredBuild?: string | { id?: string | number; name?: string }
  buildName?: string
  subItems?: SubItem[]
}

const subItemName = (s: SubItem): string => s.name ?? 'Part'

export default function CartPage() {
  const { cartID, refreshCart, removeItem, incrementItem, decrementItem, cart, isLoading } = useEcommerce()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (cartID) void refreshCart()
  }, [cartID, refreshCart])

  const rawCart = cart as { items?: Item[]; subtotal?: number } | undefined
  const items: Item[] = rawCart?.items ?? []
  const subtotal = rawCart?.subtotal ?? 0

  const titleOf = (item: Item): string => {
    if (item.lineType === 'configured-build') return item.buildName || 'Configured build'
    return typeof item.product === 'object' && item.product ? (item.product.title ?? 'Product') : 'Product'
  }

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <main className="builder-page" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Cart</h1>
      {!cartID || (items.length === 0 && !isLoading) ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          Your cart is empty. <Link href="/" style={{ color: 'var(--color-primary-hover)' }}>Browse products</Link>.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((item) => {
              const composite = item.lineType === 'configured-build'
              const subItems = item.subItems ?? []
              const isOpen = expanded.has(item.id)
              return (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    padding: 16,
                    background: 'var(--color-surface)',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <strong>{titleOf(item)}</strong>
                      {composite && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                          Configured build · {subItems.length} parts
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => void decrementItem(item.id)}
                        aria-label={`Decrease quantity of ${titleOf(item)}`}
                        style={qtyBtn}
                      >
                        −
                      </button>
                      <span aria-label={`Quantity ${item.quantity}`}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => void incrementItem(item.id)}
                        aria-label={`Increase quantity of ${titleOf(item)}`}
                        style={qtyBtn}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeItem(item.id)}
                        aria-label={`Remove ${titleOf(item)}`}
                        style={{ ...qtyBtn, color: 'var(--color-danger)' }}
                      >
                        Remove
                      </button>
                      {composite && subItems.length > 0 && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          aria-expanded={isOpen}
                          onClick={() => toggleExpand(item.id)}
                        >
                          {isOpen ? 'Hide parts' : 'Show parts'}
                        </button>
                      )}
                    </div>
                  </div>
                  {composite && isOpen && (
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
                      {subItems.map((s, i) => (
                        <li key={i} style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                          {subItemName(s)} × {s.quantity ?? 1}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              Subtotal: €{(subtotal / 100).toFixed(2)}
            </span>
            <Link href="/checkout" className="btn btn--primary">
              Checkout
            </Link>
          </div>
          <p className="state-msg" style={{ marginTop: 12 }}>
            Configured builds are re-validated against current compatibility rules and prices at checkout.
          </p>
        </>
      )}
    </main>
  )
}

const qtyBtn = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-raised)',
  color: 'var(--color-text)',
  cursor: 'pointer',
} as const

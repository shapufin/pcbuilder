'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { Price } from '@/components/ui/Price'
import '../shop/shop.css'
import './cart.css'

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
  const { refreshCart, removeItem, incrementItem, decrementItem, cart, isLoading } = useEcommerce()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const rawCart = cart as { id?: string | number; items?: Item[]; subtotal?: number } | undefined
  const cartId = rawCart?.id

  useEffect(() => {
    if (cartId) void refreshCart()
  }, [cartId, refreshCart])

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
    <main className="cart-page">
      <h1 className="page__title">Cart</h1>
      {!cart || (items.length === 0 && !isLoading) ? (
        <div className="empty-state">
          <p className="empty-state__title">Your cart is empty</p>
          <p className="empty-state__desc">Browse the shop or configure a build to get started.</p>
          <Link href="/shop" className="btn btn--primary">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <ul className="cart-lines">
            {items.map((item) => {
              const composite = item.lineType === 'configured-build'
              const subItems = item.subItems ?? []
              const isOpen = expanded.has(item.id)
              return (
                <li key={item.id} className="cart-line">
                  <div className="cart-line__row">
                    <div className="cart-line__title">
                      <strong>{titleOf(item)}</strong>
                      {composite && (
                        <span className="cart-line__meta">
                          Configured build · {subItems.length} parts
                        </span>
                      )}
                    </div>
                    <div className="cart-line__controls">
                      <span className="qty-stepper">
                        <button
                          type="button"
                          onClick={() => void decrementItem(item.id)}
                          aria-label={`Decrease quantity of ${titleOf(item)}`}
                        >
                          −
                        </button>
                        <span className="qty-stepper__value" aria-label={`Quantity ${item.quantity}`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => void incrementItem(item.id)}
                          aria-label={`Increase quantity of ${titleOf(item)}`}
                        >
                          +
                        </button>
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeItem(item.id)}
                        aria-label={`Remove ${titleOf(item)}`}
                        className="cart-line__remove"
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
                    <ul className="cart-line__parts">
                      {subItems.map((s, i) => (
                        <li key={i}>
                          {subItemName(s)} × {s.quantity ?? 1}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <aside className="cart-summary" aria-label="Order summary">
            <div className="cart-summary__row cart-summary__row--total">
              <span>Subtotal</span>
              <Price cents={subtotal} />
            </div>
            <Link href="/checkout" className="btn btn--primary btn--full">
              Checkout
            </Link>
            <p className="cart-summary__note">
              Configured builds are re-validated against current compatibility rules and prices at checkout.
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}

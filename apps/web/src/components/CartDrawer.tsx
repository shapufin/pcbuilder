'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { useCartDrawerStore } from '@/lib/cart-drawer-store'
import { drawerMotion, prefersReducedMotion } from '@/lib/motion'
import { Price } from '@/components/ui/Price'

export type DrawerItem = {
  id?: string | number
  quantity?: number
  product?: { id?: number | string; title?: string } | number | string
  lineType?: string
  buildName?: string
}

type DrawerCart = { items?: DrawerItem[]; subtotal?: number }

const titleOf = (item: DrawerItem): string => {
  if (item.lineType === 'configured-build') return item.buildName || 'Configured build'
  return typeof item.product === 'object' && item.product ? item.product.title ?? 'Product' : 'Product'
}

/**
 * Entry 23 item 3 - cart drawer (07-ux-plan): slide-out from the right over
 * a backdrop, opened by the product/builder add-to-cart success paths.
 * Escape + backdrop click close it; reduced motion fades instead of slides.
 * Phase-0 redesign: styles live in shell.css (same class names — e2e and
 * the render tests select them).
 *
 * Split: `CartDrawer` gates on the store (zustand v5 snapshots initial
 * state during SSR, so the presentational `CartDrawerOverlay` is exported
 * separately and render-tested directly).
 */
export function CartDrawer() {
  const isOpen = useCartDrawerStore((s) => s.isOpen)
  const close = useCartDrawerStore((s) => s.close)
  const { cart } = useCart() as { cart?: DrawerCart }

  return (
    <AnimatePresence>
      {isOpen && (
        <CartDrawerOverlay items={cart?.items ?? []} subtotal={cart?.subtotal ?? 0} onClose={close} />
      )}
    </AnimatePresence>
  )
}

export function CartDrawerOverlay({
  items,
  subtotal,
  onClose,
}: {
  items: DrawerItem[]
  subtotal: number
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <motion.div
      className="cart-drawer-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        onClick={(e) => e.stopPropagation()}
        {...drawerMotion(prefersReducedMotion())}
      >
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">Your cart</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="cart-drawer__close"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="cart-drawer__empty">
            Your cart is empty.{' '}
            <Link href="/" onClick={onClose}>
              Browse products
            </Link>
          </p>
        ) : (
          <ul className="cart-drawer__list">
            {items.map((item, i) => (
              <li key={item.id ?? i} className="cart-drawer__item">
                <span>{titleOf(item)}</span>
                <span className="cart-drawer__item-qty">× {item.quantity ?? 1}</span>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <footer className="cart-drawer__footer">
            <div className="cart-drawer__subtotal">
              <span>Subtotal</span>
              <Price cents={subtotal} />
            </div>
            <div className="cart-drawer__actions">
              <Link href="/cart" onClick={onClose} className="btn btn--secondary">
                View cart
              </Link>
              <Link href="/checkout" onClick={onClose} className="btn">
                Checkout
              </Link>
            </div>
          </footer>
        )}
      </motion.aside>
    </motion.div>
  )
}

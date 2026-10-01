'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { useCartDrawerStore } from '@/lib/cart-drawer-store'
import { drawerMotion, prefersReducedMotion } from '@/lib/motion'

export type DrawerItem = {
  id?: string | number
  quantity?: number
  product?: { id?: number | string; title?: string } | number | string
  lineType?: string
  buildName?: string
}

type DrawerCart = { items?: DrawerItem[]; subtotal?: number }

const linkBtnBase: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  textAlign: 'center',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
}

const titleOf = (item: DrawerItem): string => {
  if (item.lineType === 'configured-build') return item.buildName || 'Configured build'
  return typeof item.product === 'object' && item.product ? item.product.title ?? 'Product' : 'Product'
}

/**
 * Entry 23 item 3 - cart drawer (07-ux-plan): slide-out from the right over
 * a backdrop, opened by the product/builder add-to-cart success paths.
 * Escape + backdrop click close it; reduced motion fades instead of slides.
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>Your cart</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            style={{
              border: 0,
              background: 'transparent',
              color: 'var(--color-text-muted)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Your cart is empty.{' '}
            <Link href="/" onClick={onClose} style={{ color: 'var(--color-primary-hover)' }}>
              Browse products
            </Link>
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12, alignContent: 'start', overflowY: 'auto' }}>
            {items.map((item, i) => (
              <li
                key={item.id ?? i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontSize: 14,
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: 8,
                }}
              >
                <span>{titleOf(item)}</span>
                <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>× {item.quantity ?? 1}</span>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <footer style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
              <span>Subtotal</span>
              <span>€{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                href="/cart"
                onClick={onClose}
                style={{ ...linkBtnBase, flex: 1, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                View cart
              </Link>
              <Link
                href="/checkout"
                onClick={onClose}
                style={{ ...linkBtnBase, flex: 1, background: 'var(--color-primary-strong)', color: 'var(--color-on-primary)' }}
              >
                Checkout
              </Link>
            </div>
          </footer>
        )}
      </motion.aside>
    </motion.div>
  )
}

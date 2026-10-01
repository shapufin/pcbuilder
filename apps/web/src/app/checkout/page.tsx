'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { track } from '@/lib/analytics'

type Item = {
  id: string
  quantity: number
  product?: { title?: string } | number | string
  lineType?: string
  buildName?: string
  subItems?: { name?: string; quantity?: number }[]
}

export default function CheckoutPage() {
  const { initiatePayment, confirmOrder, selectedPaymentMethod, cart } = useEcommerce()
  const [state, setState] = useState<'idle' | 'paying' | 'confirming' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  const hasStripe = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  const cartId = (cart as { id?: string | number } | undefined)?.id
  const items = (cart as { items?: Item[] } | undefined)?.items ?? []
  const subtotal = (cart as { subtotal?: number } | undefined)?.subtotal ?? 0

  const titleOf = (item: Item): string => {
    if (item.lineType === 'configured-build') return item.buildName || 'Configured build'
    return typeof item.product === 'object' && item.product ? (item.product.title ?? 'Product') : 'Product'
  }

  const pay = async () => {
    if (!selectedPaymentMethod) return
    // The buyer's email drives guest order identity + confirmation/shipping
    // emails (orderEmailsAfterChange); the plugin 400s guest confirm without it.
    const buyerEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      setMessage('Enter a valid email for your order confirmation.')
      setState('error')
      return
    }
    setState('paying')
    try {
      // Pre-flight: confirmOrder catches every error into a generic 500, so
      // the per-slot build reasons have to arrive BEFORE payment starts.
      const validate = await fetch(`/api/carts/${cartId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: window.localStorage.getItem('cart_secret') ?? undefined }),
      })
      if (!validate.ok) {
        const data = (await validate.json().catch(() => null)) as
          | { reasons?: string[]; error?: string }
          | null
        const reasons = data?.reasons ?? []
        setMessage(
          reasons.length > 0
            ? reasons.join(' · ')
            : data?.error || 'Your build is no longer compatible. Update it in the configurator.',
        )
        setState('error')
        return
      }
      const result = (await initiatePayment(selectedPaymentMethod, {
        additionalData: { customerEmail: buyerEmail },
      })) as { message?: string; error?: unknown }
      setMessage(result?.message ?? '')
      setState('confirming')
      const confirmed = (await confirmOrder(selectedPaymentMethod, {
        additionalData: { customerEmail: buyerEmail },
      })) as { message?: string }
      setMessage(confirmed?.message ?? 'Order confirmed.')
      track('Purchase', { currency: 'EUR' })
      setState('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Payment failed.')
      setState('error')
    }
  }

  if (!cart) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Your cart is empty.</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Checkout</h1>
      {!hasStripe ? (
        <p style={{ color: 'var(--color-warning)' }}>
          Stripe is not configured. Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code>STRIPE_SECRET_KEY</code> in your
          environment to enable card payments.
        </p>
      ) : state === 'done' ? (
        <p style={{ color: 'var(--color-success)' }}>✓ {message || 'Order confirmed.'}</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8, marginBottom: 16 }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  border: '1px solid var(--color-surface)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  background: 'var(--color-surface)',
                }}
              >
                <span>
                  {titleOf(item)}
                  {item.lineType === 'configured-build' && (item.subItems?.length ?? 0) > 0 && (
                    <span style={{ color: 'var(--color-text-muted)' }}> · {item.subItems!.length} parts</span>
                  )}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>× {item.quantity}</span>
              </li>
            ))}
          </ul>
          <p style={{ color: 'var(--color-text)', marginBottom: 16 }}>
            Total: <strong>€{(subtotal / 100).toFixed(2)}</strong>
          </p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Payment method: <strong>Card (Stripe)</strong>
          </p>
          <label htmlFor="checkout-email" style={{ display: 'block', color: 'var(--color-text)', marginBottom: 6 }}>
            Email for order confirmation
          </label>
          <input
            id="checkout-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={emailInput}
          />
          <button onClick={pay} disabled={state === 'paying' || state === 'confirming'} style={payBtn}>
            {state === 'paying' ? 'Processing…' : state === 'confirming' ? 'Confirming…' : 'Pay now'}
          </button>
          {state === 'error' && <p style={{ color: 'var(--color-danger)', marginTop: 12 }}>{message}</p>}
          <p style={{ marginTop: 16 }}>
            <Link href="/cart" style={{ color: 'var(--color-primary-hover)' }}>
              Back to cart
            </Link>
          </p>
        </>
      )}
    </main>
  )
}

const payBtn = {
  padding: '12px 32px', borderRadius: 8, border: 'none', background: 'var(--color-primary-strong)',
  color: 'var(--color-on-primary)', fontWeight: 600, cursor: 'pointer',
} as const

const emailInput = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px', marginBottom: 16,
  borderRadius: 8, border: '1px solid var(--color-surface)', background: 'var(--color-surface)', color: 'var(--color-text)',
} as const

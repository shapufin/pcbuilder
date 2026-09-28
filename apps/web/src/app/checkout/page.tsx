'use client'

import { useState } from 'react'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

export default function CheckoutPage() {
  const { initiatePayment, confirmOrder, selectedPaymentMethod, cartID } = useEcommerce()
  const [state, setState] = useState<'idle' | 'paying' | 'confirming' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const hasStripe = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

  const pay = async () => {
    if (!selectedPaymentMethod) return
    setState('paying')
    try {
      const result = (await initiatePayment(selectedPaymentMethod, {
        additionalData: { customerEmail: 'guest@buildmyrig.test' },
      })) as { message?: string; error?: unknown }
      setMessage(result?.message ?? '')
      setState('confirming')
      const confirmed = (await confirmOrder(selectedPaymentMethod)) as { message?: string }
      setMessage(confirmed?.message ?? 'Order confirmed.')
      setState('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Payment failed.')
      setState('error')
    }
  }

  if (!cartID) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        <p style={{ color: '#64748b' }}>Your cart is empty.</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Checkout</h1>
      {!hasStripe ? (
        <p style={{ color: '#f59e0b' }}>
          Stripe is not configured. Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code>STRIPE_SECRET_KEY</code> in your
          environment to enable card payments.
        </p>
      ) : state === 'done' ? (
        <p style={{ color: '#059669' }}>✓ {message || 'Order confirmed.'}</p>
      ) : (
        <>
          <p style={{ color: '#94a3b8', marginBottom: 16 }}>
            Payment method: <strong>Card (Stripe)</strong>
          </p>
          <button onClick={pay} disabled={state === 'paying' || state === 'confirming'} style={payBtn}>
            {state === 'paying' ? 'Processing…' : state === 'confirming' ? 'Confirming…' : 'Pay now'}
          </button>
          {state === 'error' && <p style={{ color: '#f87171', marginTop: 12 }}>{message}</p>}
        </>
      )}
    </main>
  )
}

const payBtn = {
  padding: '12px 32px', borderRadius: 8, border: 'none', background: '#4f46e5',
  color: '#fff', fontWeight: 600, cursor: 'pointer',
} as const

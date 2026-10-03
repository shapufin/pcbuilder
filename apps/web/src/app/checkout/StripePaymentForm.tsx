'use client'

import { useState } from 'react'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

/**
 * Embedded card form mounted inside <Elements> once initiatePayment has
 * returned a clientSecret. elements.submit() validates, confirmPayment with
 * redirect:'if_required' settles inline; only then do we call confirmOrder —
 * the adapter requires the PaymentIntent to already be 'succeeded'.
 */
export function StripePaymentForm({ onPaid, disabled }: { onPaid: () => void; disabled?: boolean }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || busy) return
    setBusy(true)
    setError('')
    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Check your payment details.')
      setBusy(false)
      return
    }
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/checkout` },
    })
    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed.')
      setBusy(false)
      return
    }
    // PaymentIntent is now 'succeeded' — hand off to order confirmation.
    onPaid()
  }

  return (
    <form onSubmit={submit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || busy || disabled}
        className="btn btn--primary btn--full pay-btn"
      >
        {busy ? 'Processing…' : 'Pay now'}
      </button>
      {error && <p className="state-msg state-msg--error">{error}</p>}
    </form>
  )
}

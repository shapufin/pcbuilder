'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { track } from '@/lib/analytics'
import { validateShippingAddress, type ShippingAddressInput } from '@/lib/checkout'
import { StripePaymentForm } from './StripePaymentForm'

type Item = {
  id: string
  quantity: number
  product?: { title?: string } | number | string
  lineType?: string
  buildName?: string
  subItems?: { name?: string; quantity?: number }[]
}

// Module-level promise: loadStripe is called once per page lifetime.
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export default function CheckoutPage() {
  const { initiatePayment, confirmOrder, selectedPaymentMethod, paymentMethods, cart, refreshCart } = useEcommerce()
  // 3DS/redirect return (review R2-I1): Stripe appends payment_intent +
  // redirect_status to the return URL. Read once lazily; the effect below
  // finalizes the order. The payment already succeeded at Stripe — the
  // webhook settles the money side, so this confirm is idempotent UX only.
  const [stripeReturn] = useState(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const paymentIntentID = params.get('payment_intent')
    const redirectStatus = params.get('redirect_status')
    return paymentIntentID && redirectStatus ? { paymentIntentID, redirectStatus } : null
  })
  const returnFailed = stripeReturn != null && stripeReturn.redirectStatus !== 'succeeded'
  const [state, setState] = useState<'idle' | 'initiating' | 'paying' | 'confirming' | 'done' | 'error'>(
    returnFailed ? 'error' : 'idle',
  )
  const [message, setMessage] = useState(
    returnFailed ? 'Payment was not completed — no charge was made. You can try again.' : '',
  )
  const [email, setEmail] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [discountMsg, setDiscountMsg] = useState('')
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  // Shipping address (plan item C1): drives the order + confirmation email and
  // the country the tax-rate match uses. Kept as one object so the whole
  // address is validated in one place before payment.
  const [address, setAddress] = useState<ShippingAddressInput>({})
  // Set after initiatePayment: mounting <Elements> needs the clientSecret,
  // and confirmOrder needs the paymentIntentID (adapter requires the PI to
  // be 'succeeded', so confirmPayment must run first).
  const [paymentIntent, setPaymentIntent] = useState<{ clientSecret: string; paymentIntentID: string } | null>(null)

  const hasStripe = Boolean(stripePromise)
  const cartId = (cart as { id?: string | number } | undefined)?.id
  const items = (cart as { items?: Item[] } | undefined)?.items ?? []
  // M6: a single configured payment method auto-selects — no reason to make
  // the buyer pick "Card" when it's the only option.
  const method =
    selectedPaymentMethod ?? (paymentMethods?.length === 1 ? paymentMethods[0].name : null)
  const subtotal = (cart as { subtotal?: number } | undefined)?.subtotal ?? 0
  // Server-computed totals (audit gaps P2-C3/C4/C5): the cart hook derives
  // these on every write — they are never trusted from the client.
  const totals = cart as
    | { discountTotal?: number; shippingTotal?: number; taxTotal?: number; total?: number; discountCode?: { code?: string } | number | null }
    | undefined
  const discountTotal = totals?.discountTotal ?? 0
  const shippingTotal = totals?.shippingTotal ?? 0
  const taxTotal = totals?.taxTotal ?? 0
  const total = totals?.total ?? subtotal
  const appliedCode = typeof totals?.discountCode === 'object' && totals?.discountCode ? totals.discountCode.code : null
  // €0 orders (full discount / free-shipping stack): Stripe rejects a €0
  // PaymentIntent, so degrade honestly instead of dead-ending at the API.
  const isFree = total <= 0

  const titleOf = (item: Item): string => {
    if (item.lineType === 'configured-build') return item.buildName || 'Configured build'
    return typeof item.product === 'object' && item.product ? (item.product.title ?? 'Product') : 'Product'
  }

  const elementsOptions = useMemo(
    // Empty clientSecret (3DS return path — the PI is already done at Stripe)
    // must not mount <Elements>: confirm-only flow, no card UI.
    () => (paymentIntent?.clientSecret ? { clientSecret: paymentIntent.clientSecret } : undefined),
    [paymentIntent],
  )

  const startPayment = async () => {
    if (!method) return
    // The buyer's email drives guest order identity + confirmation/shipping
    // emails (orderEmailsAfterChange); the plugin 400s guest confirm without it.
    const buyerEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      setMessage('Enter a valid email for your order confirmation.')
      setState('error')
      return
    }
    const checked = validateShippingAddress(address)
    if (!checked.ok) {
      setMessage(checked.errors.join(' '))
      setState('error')
      return
    }
    setState('initiating')
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
      // Persist the country first: the adapter charges the server-computed
      // `cart.total`, so the country-specific tax rate must be applied before
      // the PaymentIntent is created.
      const country = await fetch(`/api/carts/${cartId}/shipping-country`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: checked.address.country,
          secret: window.localStorage.getItem('cart_secret') ?? undefined,
        }),
      })
      if (!country.ok) {
        const data = (await country.json().catch(() => null)) as { error?: string } | null
        setMessage(data?.error || 'Could not apply the shipping country.')
        setState('error')
        return
      }
      // Show the country-driven total before the buyer pays.
      await refreshCart()
      // The plugin JSONs this into the PaymentIntent metadata; the webhook and
      // the confirmOrder poll both write it onto the order.
      const result = (await initiatePayment(method, {
        additionalData: { customerEmail: buyerEmail, shippingAddress: checked.address },
      })) as { clientSecret?: string; paymentIntentID?: string; message?: string }
      if (!result?.clientSecret || !result?.paymentIntentID) {
        throw new Error('Payment could not be started — missing client secret.')
      }
      setPaymentIntent({ clientSecret: result.clientSecret, paymentIntentID: result.paymentIntentID })
      setState('paying')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Payment failed.')
      setState('error')
    }
  }

  const applyDiscount = async () => {
    const code = discountInput.trim()
    if (!code || !cartId) return
    setApplyingDiscount(true)
    setDiscountMsg('')
    try {
      const res = await fetch(`/api/carts/${cartId}/apply-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, secret: window.localStorage.getItem('cart_secret') ?? undefined }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setDiscountMsg(data?.error || 'This discount code cannot be applied.')
        return
      }
      setDiscountInput('')
      setDiscountMsg('Discount applied.')
      await refreshCart()
    } catch {
      setDiscountMsg('Could not apply the discount code — try again.')
    } finally {
      setApplyingDiscount(false)
    }
  }

  // Called by StripePaymentForm after confirmPayment succeeds — the PI is
  // 'succeeded', so the adapter's confirmOrder can finalize the order now.
  const finalize = async () => {
    if (!method || !paymentIntent?.paymentIntentID) return
    setState('confirming')
    try {
      const confirmed = (await confirmOrder(method, {
        additionalData: { customerEmail: email.trim(), paymentIntentID: paymentIntent.paymentIntentID },
      })) as { message?: string }
      setMessage(confirmed?.message ?? 'Order confirmed.')
      track('purchase', { currency: 'EUR' })
      setState('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Order confirmation failed — contact support with your receipt.')
      setState('error')
    }
  }

  // 3DS/redirect return: the PI already succeeded at Stripe. Run the adapter's
  // confirmOrder once so the buyer lands on "Order confirmed" — the webhook
  // settles independently, so this is idempotent and failure-safe.
  const handledReturn = useRef(false)
  useEffect(() => {
    if (!stripeReturn || stripeReturn.redirectStatus !== 'succeeded') return
    if (handledReturn.current || !method) return
    handledReturn.current = true
    window.history.replaceState(null, '', window.location.pathname)
    void (async () => {
      setPaymentIntent({ clientSecret: '', paymentIntentID: stripeReturn.paymentIntentID })
      setState('confirming')
      try {
        const confirmed = (await confirmOrder(method, {
          additionalData: { paymentIntentID: stripeReturn.paymentIntentID },
        })) as { message?: string }
        setMessage(confirmed?.message ?? 'Order confirmed.')
        track('purchase', { currency: 'EUR' })
        setState('done')
      } catch (err) {
        setMessage(
          err instanceof Error
            ? err.message
            : 'Payment received — order confirmation is finishing in the background.',
        )
        setState('error')
      }
    })()
  }, [stripeReturn, method, confirmOrder])

  // Empty-cart guard (review R2-I3): a cart doc with zero items can reach
  // checkout — nothing should be chargeable.
  if (!cart || items.length === 0) {
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
          <div style={{ display: 'grid', gap: 4, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text)' }}>Subtotal</span>
              <span style={{ color: 'var(--color-text)' }}>€{(subtotal / 100).toFixed(2)}</span>
            </div>
            {discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-success)' }}>
                  Discount{appliedCode ? ` (${appliedCode})` : ''}
                </span>
                <span style={{ color: 'var(--color-success)' }}>−€{(discountTotal / 100).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text)' }}>Shipping</span>
              <span style={{ color: 'var(--color-text)' }}>
                {shippingTotal > 0 ? `€${(shippingTotal / 100).toFixed(2)}` : 'Free'}
              </span>
            </div>
            {taxTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>incl. VAT</span>
                <span style={{ color: 'var(--color-text-muted)' }}>€{(taxTotal / 100).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-text)' }}>Total</span>
              <span style={{ color: 'var(--color-text)' }}>€{(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              aria-label="Discount code"
              type="text"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="Discount code"
              disabled={state !== 'idle' || applyingDiscount}
              style={{ ...emailInput, marginBottom: 0, flex: 1 }}
            />
            <button
              onClick={applyDiscount}
              disabled={state !== 'idle' || applyingDiscount || !discountInput.trim()}
              style={{ ...payBtn, background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              {applyingDiscount ? 'Applying…' : 'Apply'}
            </button>
          </div>
          {discountMsg && (
            <p style={{ color: discountMsg === 'Discount applied.' ? 'var(--color-success)' : 'var(--color-danger)', marginBottom: 16 }}>
              {discountMsg}
            </p>
          )}
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Payment method: <strong>Card (Stripe)</strong>
          </p>

          {paymentIntent && elementsOptions ? (            <Elements stripe={stripePromise} options={elementsOptions}>
              <StripePaymentForm onPaid={finalize} disabled={state === 'confirming'} />
            </Elements>
          ) : isFree ? (
            <p style={{ color: 'var(--color-text-muted)' }}>
              Your total is €0 — free orders can&apos;t be placed through card checkout yet. Contact
              sales and we&apos;ll complete it manually.
            </p>
          ) : (
            <>
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 10 }}>
                  Shipping address
                </legend>
                {ADDRESS_FIELDS.map((f) => (
                  <div key={f.name} style={f.half ? { display: 'inline-block', width: 'calc(50% - 6px)' } : undefined}>
                    <label htmlFor={`checkout-${f.name}`} style={{ display: 'block', color: 'var(--color-text)', marginBottom: 6 }}>
                      {f.label}
                      {f.required && <span aria-hidden="true"> *</span>}
                    </label>
                    <input
                      id={`checkout-${f.name}`}
                      name={f.name}
                      required={f.required}
                      autoComplete={f.autoComplete}
                      value={address[f.name] ?? ''}
                      onChange={(e) => setAddress((prev) => ({ ...prev, [f.name]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ ...emailInput, marginRight: f.half ? 6 : 0 }}
                    />
                  </div>
                ))}
              </fieldset>
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
              <button onClick={startPayment} disabled={state === 'initiating'} style={payBtn}>
                {state === 'initiating' ? 'Preparing payment…' : 'Continue to payment'}
              </button>
            </>
          )}
          {state === 'confirming' && <p style={{ color: 'var(--color-text-muted)', marginTop: 12 }}>Confirming order…</p>}
          {state === 'error' && <p style={{ color: 'var(--color-danger)', marginTop: 12 }}>{message}</p>}
          {/* M3: a failed confirmOrder (network blip after Stripe succeeded)
              must be retryable — the charge exists, only the order record lags. */}
          {state === 'error' && paymentIntent?.paymentIntentID && (
            <button onClick={finalize} style={{ ...payBtn, marginTop: 12 }}>
              Retry order confirmation
            </button>
          )}
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

/** Mirrors the plugin's `defaultAddressFields` order; country is ISO alpha-2. */
const ADDRESS_FIELDS = [
  { name: 'firstName', label: 'First name', required: true, autoComplete: 'given-name', half: true },
  { name: 'lastName', label: 'Last name', required: true, autoComplete: 'family-name', half: true },
  { name: 'addressLine1', label: 'Street address', required: true, autoComplete: 'address-line1', half: false },
  { name: 'addressLine2', label: 'Address line 2 (optional)', required: false, autoComplete: 'address-line2', half: false },
  { name: 'city', label: 'City', required: true, autoComplete: 'address-level2', half: true },
  { name: 'postalCode', label: 'Postal code', required: true, autoComplete: 'postal-code', half: true },
  { name: 'country', label: 'Country (ISO code, e.g. DE)', required: true, autoComplete: 'country', placeholder: 'DE', half: true },
  { name: 'phone', label: 'Phone (optional)', required: false, autoComplete: 'tel', half: true },
] satisfies Array<{
  name: keyof ShippingAddressInput
  label: string
  required: boolean
  autoComplete: string
  half: boolean
  placeholder?: string
}>

const emailInput = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px', marginBottom: 16,
  borderRadius: 8, border: '1px solid var(--color-surface)', background: 'var(--color-surface)', color: 'var(--color-text)',
} as const

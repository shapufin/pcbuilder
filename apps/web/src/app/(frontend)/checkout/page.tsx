'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { track } from '@/lib/analytics'
import {
  buyerCheck,
  cartLineTitle,
  cartTotals,
  errorMessageFrom,
  parseStripeReturn,
  postCartAction,
  type ShippingAddressInput,
} from '@/lib/checkout'
import { Price } from '@/components/ui/Price'
import { StripePaymentForm } from './StripePaymentForm'
import { PackagingPicker } from '@/components/PackagingPicker'
import '../shop/shop.css'
import './checkout.css'

type Item = {
  id: string
  quantity: number
  product?: { title?: string } | number | string
  lineType?: string
  buildName?: string
  lineLabel?: string
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
  const [stripeReturn] = useState(() =>
    typeof window === 'undefined' ? null : parseStripeReturn(window.location.search),
  )
  const returnFailed = stripeReturn != null && stripeReturn.redirectStatus !== 'succeeded'
  const [state, setState] = useState<'idle' | 'initiating' | 'paying' | 'confirming' | 'done' | 'error'>(
    returnFailed ? 'error' : 'idle',
  )
  const [message, setMessage] = useState(
    returnFailed ? 'Payment was not completed. No charge was made, so you can try again.' : '',
  )
  const [email, setEmail] = useState('')
  const [emailInvalid, setEmailInvalid] = useState(false)
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
  // Server-computed totals (audit gaps P2-C3/C4/C5) — never trusted from the
  // client; €0 carts confirm via /confirm-free (no card UI).
  const { subtotal, discountTotal, shippingTotal, taxTotal, total, appliedCode, isFree } = cartTotals(cart)
  const titleOf = cartLineTitle

  const elementsOptions = useMemo(
    // Empty clientSecret (3DS return path — the PI is already done at Stripe)
    // must not mount <Elements>: confirm-only flow, no card UI.
    () => (paymentIntent?.clientSecret ? { clientSecret: paymentIntent.clientSecret } : undefined),
    [paymentIntent],
  )

  const fail = (text: string) => {
    setMessage(text)
    setState('error')
  }

  /** Email + address gate shared by the paid and €0 paths. */
  const checkBuyer = () => {
    const checked = buyerCheck(email, address)
    if (!checked.ok) {
      if (checked.emailInvalid) setEmailInvalid(true)
      fail(checked.message)
      return null
    }
    return checked
  }

  const startPayment = async () => {
    if (!method || !cartId) return
    const buyer = checkBuyer()
    if (!buyer) return
    setState('initiating')
    try {
      // Pre-flight: confirmOrder catches every error into a generic 500, so
      // the per-slot build reasons have to arrive BEFORE payment starts.
      const validate = await postCartAction<{ reasons?: string[]; error?: string }>(cartId, 'validate')
      if (!validate.ok) {
        return fail(errorMessageFrom(validate.data, 'Your build is no longer compatible. Update it in the configurator.'))
      }
      // Persist the country first: the adapter charges the server-computed
      // `cart.total`, so the country-specific tax rate must be applied before
      // the PaymentIntent is created.
      const country = await postCartAction<{ error?: string }>(cartId, 'shipping-country', {
        country: buyer.address.country,
      })
      if (!country.ok) return fail(country.data?.error || 'Could not apply the shipping country.')
      // Show the country-driven total before the buyer pays.
      await refreshCart()
      // The plugin JSONs this into the PaymentIntent metadata; the webhook and
      // the confirmOrder poll both write it onto the order.
      const result = (await initiatePayment(method, {
        additionalData: { customerEmail: buyer.email, shippingAddress: buyer.address },
      })) as { clientSecret?: string; paymentIntentID?: string; message?: string }
      if (!result?.clientSecret || !result?.paymentIntentID) {
        throw new Error('Payment could not be started. Please try again.')
      }
      setPaymentIntent({ clientSecret: result.clientSecret, paymentIntentID: result.paymentIntentID })
      // Survives the 3DS redirect: the return-confirm needs the email for
      // guest order finalization, and React state is rebuilt on return.
      window.sessionStorage.setItem('checkout_email', buyer.email)
      setState('paying')
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Payment failed.')
    }
  }

  // €0 carts (full discount / free-shipping stack): Stripe rejects a €0
  // PaymentIntent, so the order is confirmed server-side without a charge.
  // The endpoint re-prices and re-verifies the total — nothing here is trusted.
  const placeFreeOrder = async () => {
    if (!cartId) return
    const buyer = checkBuyer()
    if (!buyer) return
    setState('confirming')
    try {
      const res = await postCartAction<{ error?: string; reasons?: string[] }>(cartId, 'confirm-free', {
        customerEmail: buyer.email,
        shippingAddress: buyer.address,
      })
      if (!res.ok) return fail(errorMessageFrom(res.data, 'Could not place the order.'))
      setMessage('Order confirmed.')
      track('purchase', { currency: 'EUR' })
      setState('done')
    } catch {
      fail('Could not place the order. Please try again.')
    }
  }

  const applyDiscount = async () => {
    const code = discountInput.trim()
    if (!code || !cartId) return
    setApplyingDiscount(true)
    setDiscountMsg('')
    try {
      const res = await postCartAction<{ error?: string }>(cartId, 'apply-discount', { code })
      if (!res.ok) {
        setDiscountMsg(res.data?.error || 'This discount code cannot be applied.')
        return
      }
      setDiscountInput('')
      setDiscountMsg('Discount applied.')
      await refreshCart()
    } catch {
      setDiscountMsg('Could not apply the discount code. Please try again.')
    } finally {
      setApplyingDiscount(false)
    }
  }

  /** Shared tail of both confirm paths (card + 3DS return). */
  const confirmWith = async (paymentIntentID: string, customerEmail: string, failCopy: string) => {
    if (!method) return
    setState('confirming')
    try {
      const confirmed = (await confirmOrder(method, {
        additionalData: { customerEmail, paymentIntentID },
      })) as { message?: string }
      setMessage(confirmed?.message ?? 'Order confirmed.')
      track('purchase', { currency: 'EUR' })
      setState('done')
    } catch (err) {
      fail(err instanceof Error ? err.message : failCopy)
    }
  }

  // Called by StripePaymentForm after confirmPayment succeeds — the PI is
  // 'succeeded', so the adapter's confirmOrder can finalize the order now.
  const finalize = async () => {
    if (!paymentIntent?.paymentIntentID) return
    await confirmWith(
      paymentIntent.paymentIntentID,
      email.trim(),
      'Order confirmation failed. Contact support with your receipt.',
    )
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
    setPaymentIntent({ clientSecret: '', paymentIntentID: stripeReturn.paymentIntentID })
    void confirmWith(
      stripeReturn.paymentIntentID,
      window.sessionStorage.getItem('checkout_email') ?? '',
      'Payment received. Your order confirmation is finishing in the background.',
    )
    // confirmWith is recreated each render; the ref guard keeps this once-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeReturn, method, confirmOrder])

  // Once payment is in flight the empty-cart view must never win:
  // confirmOrder/webhook settlement empties the cart, which would otherwise
  // swap "Order confirmed" (or a retryable error) for "Your cart is empty".
  const paymentInFlight =
    Boolean(paymentIntent?.paymentIntentID) || state === 'confirming' || state === 'done'
  // Empty-cart guard (review R2-I3): a cart doc with zero items can reach
  // checkout — nothing should be chargeable.
  if (!paymentInFlight) {
    if (cart === undefined) {
      return (
        <main className="checkout-page checkout-page--narrow">
          <h1 className="page__title">Checkout</h1>
          <p className="checkout-msg checkout-msg--muted">Loading your cart…</p>
        </main>
      )
    }
    if (!cart || items.length === 0) {
      return (
        <main className="checkout-page checkout-page--narrow">
          <h1 className="page__title">Checkout</h1>
          <div className="empty-state">
            <p className="empty-state__title">Your cart is empty</p>
            <Link href="/shop" className="btn btn--primary">
              Browse products
            </Link>
          </div>
        </main>
      )
    }
  }

  return (
    <main className="checkout-page">
      <h1 className="page__title">Checkout</h1>
      {!hasStripe && !isFree ? (
        <p className="checkout-msg checkout-msg--warn">
          Stripe is not configured. Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code>STRIPE_SECRET_KEY</code> in your
          environment to enable card payments.
        </p>
      ) : state === 'done' ? (
        <div className="empty-state" role="status">
          <p className="empty-state__title">{message || 'Order confirmed.'}</p>
          <Link href="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <div className="checkout-form">
            {paymentIntent ? (
              elementsOptions ? (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <StripePaymentForm onPaid={finalize} disabled={state === 'confirming'} />
                </Elements>
              ) : (
                // 3DS return (clientSecret:''): the charge already exists at
                // Stripe — render a status panel, NEVER the address form, so
                // startPayment can't create a second PaymentIntent.
                <p className="checkout-msg checkout-msg--muted">
                  Payment received — finalizing your order…
                </p>
              )
            ) : (
              <>
                <fieldset className="checkout-form__section">
                  <legend className="checkout-form__legend">Shipping address</legend>
                  <div className="address-grid">
                    {ADDRESS_FIELDS.map((f) => (
                      <div key={f.name} className={`field${f.half ? '' : ' field--full'}`}>
                        <label htmlFor={`checkout-${f.name}`} className="field__label">
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
                          className="input"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
                <div className="field">
                  <label htmlFor="checkout-email" className="field__label">
                    Email for order confirmation
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailInvalid(false)
                    }}
                    aria-invalid={emailInvalid || undefined}
                    placeholder="you@example.com"
                    className="input"
                  />
                </div>
                {/* Entry 71: packaging tier sits before payment starts so its
                    server-priced line is inside the PaymentIntent amount. */}
                <PackagingPicker disabled={state !== 'idle'} />
                {isFree ? (
                  <button type="button" onClick={placeFreeOrder} disabled={state === 'confirming'} className="btn btn--primary">
                    {state === 'confirming' ? 'Placing order…' : 'Place free order'}
                  </button>
                ) : (
                  <button type="button" onClick={startPayment} disabled={state === 'initiating'} className="btn btn--primary">
                    {state === 'initiating' ? 'Preparing payment…' : 'Continue to payment'}
                  </button>
                )}
              </>
            )}
            <div aria-live="polite">
              {state === 'confirming' && <p className="checkout-msg checkout-msg--muted">Confirming order…</p>}
              {state === 'error' && <p className="checkout-msg checkout-msg--err" role="alert">{message}</p>}
            </div>
            {/* M3: a failed confirmOrder (network blip after Stripe succeeded)
                must be retryable — the charge exists, only the order record lags. */}
            {state === 'error' && paymentIntent?.paymentIntentID && (
              <button type="button" onClick={finalize} className="btn btn--secondary">
                Retry order confirmation
              </button>
            )}
            <p className="checkout-msg checkout-msg--muted">
              <Link href="/cart">← Back to cart</Link>
            </p>
          </div>

          <aside className="order-summary" aria-label="Order summary">
            <ul className="order-summary__lines">
              {items.map((item) => (
                <li key={item.id} className="order-summary__line">
                  <span>
                    {titleOf(item)}
                    {item.lineType === 'configured-build' && (item.subItems?.length ?? 0) > 0 && (
                      <span className="order-summary__line-qty"> · {item.subItems!.length} parts</span>
                    )}
                  </span>
                  <span className="order-summary__line-qty">× {item.quantity}</span>
                </li>
              ))}
            </ul>

            <div className="discount-row">
              <input
                aria-label="Discount code"
                type="text"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="Discount code"
                disabled={state !== 'idle' || applyingDiscount}
                className="input"
              />
              <button
                type="button"
                onClick={applyDiscount}
                disabled={state !== 'idle' || applyingDiscount || !discountInput.trim()}
                className="btn btn--secondary"
              >
                {applyingDiscount ? 'Applying…' : 'Apply'}
              </button>
            </div>
            <div aria-live="polite">
              {discountMsg && (
                <p className={`discount-msg${discountMsg === 'Discount applied.' ? ' discount-msg--ok' : ' discount-msg--err'}`}>
                  {discountMsg}
                </p>
              )}
            </div>

            <div className="order-summary__totals">
              <div className="order-summary__row">
                <span>Subtotal</span>
                <Price cents={subtotal} />
              </div>
              {discountTotal > 0 && (
                <div className="order-summary__row order-summary__row--discount">
                  <span>Discount{appliedCode ? ` (${appliedCode})` : ''}</span>
                  <span>−<Price cents={discountTotal} /></span>
                </div>
              )}
              <div className="order-summary__row">
                <span>Shipping</span>
                <span>{shippingTotal > 0 ? <Price cents={shippingTotal} /> : 'Free'}</span>
              </div>
              {taxTotal > 0 && (
                <div className="order-summary__row order-summary__row--muted">
                  <span>incl. VAT</span>
                  <Price cents={taxTotal} />
                </div>
              )}
              <div className="order-summary__row order-summary__row--total">
                <span>Total</span>
                <Price cents={total} />
              </div>
            </div>
            <p className="checkout-msg checkout-msg--muted">
              Payment method: <strong>{isFree ? 'Free, no payment required' : 'Card (Stripe)'}</strong>
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}

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

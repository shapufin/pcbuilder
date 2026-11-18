import { describe, it, expect } from 'vitest'
import { validateShippingAddress } from './checkout.ts'

/**
 * Checkout shipping address (plan item C1): the order + confirmation email
 * carry it and the country drives the tax-rate match. Mirrors the plugin's
 * `defaultAddressFields` shape so the value drops straight into
 * `initiatePayment({ additionalData: { shippingAddress } })`.
 */
describe('validateShippingAddress', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    addressLine1: '1 Analytical Way',
    city: 'London',
    postalCode: 'EC1A 1BB',
    country: 'gb',
  }

  it('#248 normalizes a valid address (trimmed, uppercase ISO country)', () => {
    const r = validateShippingAddress({ ...valid, firstName: '  Ada ', company: '  ' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.address).toMatchObject({ firstName: 'Ada', country: 'GB', postalCode: 'EC1A 1BB' })
    expect(r.address.company).toBeUndefined()
  })

  it('#249 reports every missing required field at once', () => {
    const r = validateShippingAddress({})
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.join(' ')).toMatch(/first name/i)
    expect(r.errors.join(' ')).toMatch(/last name/i)
    expect(r.errors.join(' ')).toMatch(/address/i)
    expect(r.errors.join(' ')).toMatch(/city/i)
    expect(r.errors.join(' ')).toMatch(/postal/i)
    expect(r.errors.join(' ')).toMatch(/country/i)
  })

  it('#250 rejects a non-ISO country and over-long fields', () => {
    const r = validateShippingAddress({ ...valid, country: 'Germany' })
    expect(r.ok).toBe(false)
    const long = validateShippingAddress({ ...valid, addressLine1: 'x'.repeat(201) })
    expect(long.ok).toBe(false)
  })

  it('#251 optional fields are dropped when blank, kept when present', () => {
    const r = validateShippingAddress({ ...valid, addressLine2: 'Flat 2', state: 'Greater London', phone: '+44 20 7946 0958' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.address).toMatchObject({ addressLine2: 'Flat 2', state: 'Greater London', phone: '+44 20 7946 0958' })
  })
})

// ---- Audit 2026-11-18 R1: CheckoutPage (CC 57, untested) — its decisions
// moved here as pure helpers so they are pinned by tests.
import {
  buyerCheck,
  cartLineTitle,
  cartTotals,
  errorMessageFrom,
  parseStripeReturn,
} from './checkout'

describe('checkout helpers (audit 2026-11-18 R1)', () => {
  it('#765 cartTotals reads server totals, falls back to subtotal, flags €0', () => {
    expect(cartTotals(undefined)).toEqual({
      subtotal: 0, discountTotal: 0, shippingTotal: 0, taxTotal: 0, total: 0, appliedCode: null, isFree: true,
    })
    const t = cartTotals({ subtotal: 5000, discountTotal: 500, shippingTotal: 900, taxTotal: 0, total: 5400, discountCode: { code: 'SAVE10' } })
    expect(t).toMatchObject({ total: 5400, appliedCode: 'SAVE10', isFree: false })
    expect(cartTotals({ subtotal: 5000 }).total).toBe(5000)
    expect(cartTotals({ subtotal: 5000, total: 0, discountCode: 7 })).toMatchObject({ isFree: true, appliedCode: null })
  })

  it('#766 cartLineTitle labels packaging, builds and products', () => {
    expect(cartLineTitle({ lineType: 'packaging', lineLabel: 'Crate' })).toBe('Crate')
    expect(cartLineTitle({ lineType: 'packaging' })).toBe('Packaging')
    expect(cartLineTitle({ lineType: 'configured-build', buildName: 'Rig' })).toBe('Rig')
    expect(cartLineTitle({ product: { title: 'GPU' } })).toBe('GPU')
    expect(cartLineTitle({ product: 12 })).toBe('Product')
  })

  it('#767 buyerCheck validates email then address, returning the cleaned values', () => {
    expect(buyerCheck(' nope ', {})).toEqual({ ok: false, emailInvalid: true, message: 'Enter a valid email for your order confirmation.' })
    const bad = buyerCheck('a@b.co', {})
    expect(bad.ok).toBe(false)
    expect(bad.ok === false && bad.emailInvalid).toBe(false)
    const good = buyerCheck(' a@b.co ', { firstName: 'Ada', lastName: 'L', addressLine1: 'Rue 1', city: 'Berlin', postalCode: '10115', country: 'de' })
    expect(good.ok && good.email).toBe('a@b.co')
    expect(good.ok && good.address.country).toBe('DE')
  })

  it('#768 errorMessageFrom prefers rule reasons, then error, then fallback', () => {
    expect(errorMessageFrom({ reasons: ['A', 'B'], error: 'x' }, 'f')).toBe('A · B')
    expect(errorMessageFrom({ reasons: [], error: 'x' }, 'f')).toBe('x')
    expect(errorMessageFrom(null, 'f')).toBe('f')
  })

  it('#769 parseStripeReturn needs both payment_intent and redirect_status', () => {
    expect(parseStripeReturn('?payment_intent=pi_1&redirect_status=succeeded')).toEqual({ paymentIntentID: 'pi_1', redirectStatus: 'succeeded' })
    expect(parseStripeReturn('?payment_intent=pi_1')).toBeNull()
    expect(parseStripeReturn('')).toBeNull()
  })
})

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

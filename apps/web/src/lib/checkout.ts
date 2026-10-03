/**
 * Checkout helpers (plan item C1). The shipping address is validated here,
 * once, before it goes into `initiatePayment({ additionalData })` — the plugin
 * JSONs it into the PaymentIntent metadata and the webhook/confirmOrder write
 * it onto the order (which the confirmation email renders).
 *
 * Field shape mirrors the plugin's `defaultAddressFields`
 * (`dist/collections/addresses/defaultAddressFields.js`) so the value drops
 * straight into the order's `shippingAddress` group.
 */

export type ShippingAddressInput = {
  firstName?: string
  lastName?: string
  company?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
}

export type ShippingAddress = {
  firstName: string
  lastName: string
  addressLine1: string
  city: string
  postalCode: string
  country: string
  company?: string
  addressLine2?: string
  state?: string
  phone?: string
}

export type ShippingAddressResult =
  | { ok: true; address: ShippingAddress }
  | { ok: false; errors: string[] }

const LIMITS: Record<string, number> = {
  firstName: 80,
  lastName: 80,
  company: 120,
  addressLine1: 200,
  addressLine2: 200,
  city: 120,
  state: 120,
  postalCode: 20,
  phone: 40,
}

const REQUIRED: Array<[keyof ShippingAddressInput, string]> = [
  ['firstName', 'First name is required.'],
  ['lastName', 'Last name is required.'],
  ['addressLine1', 'Street address is required.'],
  ['city', 'City is required.'],
  ['postalCode', 'Postal code is required.'],
  ['country', 'Country is required.'],
]

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const validateShippingAddress = (input: ShippingAddressInput): ShippingAddressResult => {
  const errors: string[] = []
  const out: Record<string, string> = {}

  for (const [field, message] of REQUIRED) {
    const value = clean(input[field])
    if (!value) {
      errors.push(message)
      continue
    }
    if (value.length > (LIMITS[field] ?? 120)) {
      errors.push(`${message.replace(/ is required\.$/, '')} is too long.`)
      continue
    }
    out[field] = value
  }

  // Optional fields: kept only when non-blank; blank means "not provided".
  for (const field of ['company', 'addressLine2', 'state', 'phone'] as const) {
    const value = clean(input[field])
    if (!value) continue
    if (value.length > (LIMITS[field] ?? 120)) {
      errors.push(`${field} is too long.`)
      continue
    }
    out[field] = value
  }

  // ISO 3166-1 alpha-2 — the same key `tax-rates.country` matches on.
  if (out.country && !/^[A-Za-z]{2}$/.test(out.country)) {
    errors.push('Country must be a two-letter ISO code (e.g. DE).')
  } else if (out.country) {
    out.country = out.country.toUpperCase()
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, address: out as unknown as ShippingAddress }
}

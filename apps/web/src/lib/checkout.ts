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

// ---- Audit 2026-11-18 R1: CheckoutPage decisions as pure, tested helpers.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type CartTotalsView = {
  subtotal: number
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  appliedCode: string | null
  /** €0 orders confirm server-side via /confirm-free — Stripe rejects €0 PaymentIntents. */
  isFree: boolean
}

/** Server-computed cart totals (never derived client-side); `total` falls back to subtotal. */
export const cartTotals = (cart: unknown): CartTotalsView => {
  const c = (cart ?? {}) as {
    subtotal?: number
    discountTotal?: number
    shippingTotal?: number
    taxTotal?: number
    total?: number
    discountCode?: { code?: string } | number | null
  }
  const subtotal = c.subtotal ?? 0
  const total = c.total ?? subtotal
  const appliedCode = typeof c.discountCode === 'object' && c.discountCode ? (c.discountCode.code ?? null) : null
  return {
    subtotal,
    discountTotal: c.discountTotal ?? 0,
    shippingTotal: c.shippingTotal ?? 0,
    taxTotal: c.taxTotal ?? 0,
    total,
    appliedCode,
    isFree: total <= 0,
  }
}

export type CartLine = {
  lineType?: string
  lineLabel?: string
  buildName?: string
  product?: { title?: string } | number | string
}

export const cartLineTitle = (item: CartLine): string => {
  if (item.lineType === 'packaging') return item.lineLabel || 'Packaging'
  if (item.lineType === 'configured-build') return item.buildName || 'Configured build'
  return typeof item.product === 'object' && item.product ? (item.product.title ?? 'Product') : 'Product'
}

export type BuyerCheck =
  | { ok: true; email: string; address: ShippingAddress }
  | { ok: false; emailInvalid: boolean; message: string }

/** Email first (guest order identity + confirmation mail), then the shipping address. */
export const buyerCheck = (email: string, address: ShippingAddressInput): BuyerCheck => {
  const buyerEmail = email.trim()
  if (!EMAIL_RE.test(buyerEmail)) {
    return { ok: false, emailInvalid: true, message: 'Enter a valid email for your order confirmation.' }
  }
  const checked = validateShippingAddress(address)
  if (!checked.ok) return { ok: false, emailInvalid: false, message: checked.errors.join(' ') }
  return { ok: true, email: buyerEmail, address: checked.address }
}

/** Endpoint failure copy: per-slot build reasons win, then the server's error, then a fallback. */
export const errorMessageFrom = (
  data: { reasons?: string[]; error?: string } | null | undefined,
  fallback: string,
): string => (data?.reasons && data.reasons.length > 0 ? data.reasons.join(' · ') : data?.error || fallback)

/** Stripe 3DS/redirect return params, or null when this is not a return visit. */
export const parseStripeReturn = (
  search: string,
): { paymentIntentID: string; redirectStatus: string } | null => {
  const params = new URLSearchParams(search)
  const paymentIntentID = params.get('payment_intent')
  const redirectStatus = params.get('redirect_status')
  return paymentIntentID && redirectStatus ? { paymentIntentID, redirectStatus } : null
}

/**
 * POST a cart mutation endpoint with the guest cart secret. Returns the parsed
 * body and ok flag; network errors propagate to the caller's catch.
 */
export const postCartAction = async <T extends Record<string, unknown>>(
  cartId: string | number,
  action: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: T | null }> => {
  const res = await fetch(`/api/carts/${cartId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, secret: window.localStorage.getItem('cart_secret') ?? undefined }),
  })
  return { ok: res.ok, data: (await res.json().catch(() => null)) as T | null }
}

/**
 * Server-side order totals (04-collections/commerce.md row 27):
 * subtotal / discountTotal / shippingTotal / taxTotal / total.
 *
 * Prices are VAT-inclusive across the storefront ("VAT included"), so
 * taxTotal is the *extracted* VAT portion of the charge — it documents the
 * tax inside the total, it does not add on top. Checkout collects no address
 * yet, so the `isDefault` tax rate row applies until shipping countries are
 * collected (A19 static table).
 */

export type DiscountCodeDoc = {
  code?: string
  type?: 'percentage' | 'fixed' | 'freeShipping' | string
  value?: number | null
  enabled?: boolean | null
  maxUses?: number | null
  usedCount?: number | null
  minSubtotal?: number | null
  validFrom?: string | null
  validUntil?: string | null
}

export type ShippingBand = {
  label?: string
  minSubtotal?: number | null
  maxSubtotal?: number | null
  price?: number | null
  enabled?: boolean | null
}

export type TaxRateRow = {
  country?: string | null
  rate?: number | null
  enabled?: boolean | null
  isDefault?: boolean | null
}

export type DiscountCheck = {
  valid: boolean
  reason?: string
  discountTotal: number
  freeShipping: boolean
}

const asTime = (v: unknown): number | null => {
  if (typeof v !== 'string' || !v) return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : null
}

/**
 * Pure validation — no DB. Mirrors the discount-codes collection contract:
 * enabled, optional validFrom/validUntil window, maxUses vs usedCount,
 * minSubtotal. Returns the computed discountTotal alongside validity so the
 * endpoint and the cart hook share one math source.
 */
export const validateDiscount = (
  code: DiscountCodeDoc | null | undefined,
  subtotal: number,
  now: Date = new Date(),
): DiscountCheck => {
  const fail = (reason: string): DiscountCheck => ({ valid: false, reason, discountTotal: 0, freeShipping: false })
  if (!code || !code.code) return fail('unknown discount code')
  if (code.enabled === false) return fail('discount code is disabled')
  const t = now.getTime()
  const from = asTime(code.validFrom)
  if (from !== null && t < from) return fail('discount code is not active yet')
  const until = asTime(code.validUntil)
  if (until !== null && t > until) return fail('discount code has expired')
  if (
    typeof code.maxUses === 'number' &&
    typeof code.usedCount === 'number' &&
    code.usedCount >= code.maxUses
  ) {
    return fail('discount code has been fully used')
  }
  if (typeof code.minSubtotal === 'number' && subtotal < code.minSubtotal) {
    return fail(`minimum order not met for this code`)
  }

  if (code.type === 'percentage') {
    const pct = typeof code.value === 'number' ? code.value : NaN
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return fail('discount code is misconfigured')
    return { valid: true, discountTotal: Math.round((subtotal * pct) / 100), freeShipping: false }
  }
  if (code.type === 'fixed') {
    const amt = typeof code.value === 'number' ? code.value : NaN
    if (!Number.isFinite(amt) || amt <= 0) return fail('discount code is misconfigured')
    return { valid: true, discountTotal: Math.min(amt, subtotal), freeShipping: false }
  }
  if (code.type === 'freeShipping') {
    return { valid: true, discountTotal: 0, freeShipping: true }
  }
  return fail('discount code is misconfigured')
}

/** First enabled band whose [minSubtotal, maxSubtotal) range contains amount. */
export const pickShippingBand = (bands: ShippingBand[], amount: number): ShippingBand | null => {
  const sorted = [...bands]
    .filter((b) => b.enabled !== false)
    .sort((a, b) => (a.minSubtotal ?? 0) - (b.minSubtotal ?? 0))
  for (const band of sorted) {
    const min = band.minSubtotal ?? 0
    const max = band.maxSubtotal
    if (amount >= min && (max === null || max === undefined || amount < max)) return band
  }
  return null
}

export type CartTotals = {
  discountTotal: number
  shippingTotal: number
  taxTotal: number
  total: number
}

export const computeCartTotals = (args: {
  subtotal: number
  discountCode?: DiscountCodeDoc | null
  shippingBands: ShippingBand[]
  taxRates: TaxRateRow[]
  country?: string | null
  now?: Date
}): CartTotals => {
  const subtotal = Math.max(0, args.subtotal || 0)

  const check = args.discountCode
    ? validateDiscount(args.discountCode, subtotal, args.now)
    : { valid: false, discountTotal: 0, freeShipping: false }
  const discountTotal = check.valid ? check.discountTotal : 0

  const goodsAfterDiscount = subtotal - discountTotal
  const band = pickShippingBand(args.shippingBands, goodsAfterDiscount)
  const shippingTotal = check.valid && check.freeShipping ? 0 : (band?.price ?? 0)

  const chargeBase = goodsAfterDiscount + shippingTotal

  // Country codes compare case-insensitively — the cart stores uppercased
  // ISO-3166 alpha-2, but the admin-entered tax-rate row is free text.
  const wanted = args.country?.toUpperCase()
  const rateRow =
    args.taxRates.find(
      (r) => r.enabled !== false && r.country && wanted && String(r.country).toUpperCase() === wanted,
    ) ?? args.taxRates.find((r) => r.enabled !== false && r.isDefault)
  const rate = typeof rateRow?.rate === 'number' ? rateRow.rate : 0
  // Extracted VAT portion of a VAT-inclusive amount: gross * rate / (100+rate).
  const taxTotal = rate > 0 ? Math.round((chargeBase * rate) / (100 + rate)) : 0

  return { discountTotal, shippingTotal, taxTotal, total: chargeBase }
}

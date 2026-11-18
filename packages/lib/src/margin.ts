/**
 * Gross-margin math for the admin pricing panel.
 *
 * Everything is integer cents (01-commerce.md: money is cents until the
 * formatter). The panel is a *read-only readout* — the server still recomputes
 * the chargeable price at checkout, so nothing here is authoritative.
 */

export type MarginInput = {
  priceCents?: number | null
  costCents?: number | null
  compareAtCents?: number | null
}

export type MarginWarning =
  | 'no-price'
  | 'no-cost'
  | 'negative-margin'
  | 'msrp-not-above-price'

export type MarginResult = {
  /** True when a usable cost is present. */
  hasCost: boolean
  grossProfitCents: number | null
  /** Profit as a percentage of the retail price (1 decimal, not rounded). */
  marginPercent: number | null
  /** How much the compare-at price is discounted (1 decimal). */
  discountPercent: number | null
  warnings: MarginWarning[]
}

const usableCents = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

export const computeMargin = ({ priceCents, costCents, compareAtCents }: MarginInput): MarginResult => {
  const price = usableCents(priceCents)
  const cost = usableCents(costCents)
  const compareAt = usableCents(compareAtCents)
  const warnings: MarginWarning[] = []

  if (price === null || price === 0) warnings.push('no-price')
  if (cost === null) warnings.push('no-cost')

  const grossProfitCents = price !== null && cost !== null ? price - cost : null
  if (grossProfitCents !== null && grossProfitCents < 0) warnings.push('negative-margin')

  // A zero/absent price has no meaningful margin percentage.
  const marginPercent =
    grossProfitCents !== null && price ? (grossProfitCents / price) * 100 : null

  // The strike-through badge only makes sense when MSRP is genuinely higher.
  const discountPercent =
    compareAt !== null && price !== null && compareAt > price
      ? ((compareAt - price) / compareAt) * 100
      : null
  if (compareAt !== null && price !== null && compareAt <= price) {
    warnings.push('msrp-not-above-price')
  }

  return {
    hasCost: cost !== null,
    grossProfitCents,
    marginPercent,
    discountPercent,
    warnings,
  }
}

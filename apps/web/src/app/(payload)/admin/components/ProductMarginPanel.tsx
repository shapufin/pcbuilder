'use client'

import React from 'react'
import { useFormFields } from '@payloadcms/ui'
import { computeMargin } from '@buildmyrig/lib'
import { formatEUR } from '@buildmyrig/lib'
import { Card, CardHeader, CardTitle, CardContent, Badge, AlertBanner } from '../ui'

/**
 * Live gross-margin readout for the Pricing & Margin tab.
 *
 * Ported from the ADMIN_GUI mockup's margin calculator (audit 2026-10-22,
 * item 680). Display only: the checkout path recomputes the chargeable price
 * server-side, so a tampered form can never move money.
 *
 * `costInEUR` is staff-only access — for anyone else the field is absent from
 * the form state and the panel says so instead of inventing a margin.
 */

const num = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

const pct = (value: number | null): string =>
  value === null ? '—' : `${value > 0 ? '' : ''}${value.toFixed(1)}%`

/** Cents → currency, or an em dash when the number is unknown. Never €0.00 for
 *  "we don't know" — that reads as a real zero-profit (same trap as the PDP's
 *  fake 5.0 rating, audit item 662). */
const money = (cents: number | null): string => (cents === null ? '—' : formatEUR(cents))

export const ProductMarginPanel: React.FC = () => {
  const [priceField, compareField, costField] = useFormFields(([fields]) => [
    fields?.priceInEUR,
    fields?.compareAtPriceInEUR,
    fields?.costInEUR,
  ])

  const priceCents = num(priceField?.value)
  const compareAtCents = num(compareField?.value)
  const costCents = num(costField?.value)

  const margin = computeMargin({ priceCents, costCents, compareAtCents })
  const negative = (margin.grossProfitCents ?? 0) < 0

  return (
    <Card className="bmr-margin-panel">
      <CardHeader>
        <CardTitle>
          Margin Engine
          <Badge variant={negative ? 'destructive' : margin.hasCost ? 'success' : 'default'}>
            {negative ? 'LOSS' : margin.hasCost ? 'LIVE' : 'NO COST'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bmr-margin-panel__grid">
          <div className="bmr-margin-panel__metric">
            <span className="bmr-margin-panel__label">Retail price</span>
            <span className="bmr-margin-panel__value">{money(priceCents)}</span>
          </div>
          <div className="bmr-margin-panel__metric">
            <span className="bmr-margin-panel__label">Unit cost</span>
            <span className="bmr-margin-panel__value">
              {margin.hasCost ? money(costCents) : 'Hidden'}
            </span>
          </div>
          <div className="bmr-margin-panel__metric">
            <span className="bmr-margin-panel__label">Gross profit</span>
            <span
              className={`bmr-margin-panel__value${negative ? ' bmr-margin-panel__value--loss' : ''}`}
            >
              {money(margin.grossProfitCents)}
            </span>
          </div>
          <div className="bmr-margin-panel__metric">
            <span className="bmr-margin-panel__label">Gross margin</span>
            <span
              className={`bmr-margin-panel__value${negative ? ' bmr-margin-panel__value--loss' : ''}`}
            >
              {pct(margin.marginPercent)}
            </span>
          </div>
          <div className="bmr-margin-panel__metric">
            <span className="bmr-margin-panel__label">MSRP strike-out</span>
            <span className="bmr-margin-panel__value">
              {margin.discountPercent === null ? '—' : `-${margin.discountPercent.toFixed(1)}%`}
            </span>
          </div>
        </div>

        {margin.warnings.includes('negative-margin') && (
          <AlertBanner
            severity="critical"
            title="Unit cost exceeds the retail price"
            description="Every sale at this price loses money. Raise the price or renegotiate the wholesale cost."
          />
        )}
        {margin.warnings.includes('msrp-not-above-price') && (
          <AlertBanner
            severity="warning"
            title="Compare-at price is not above the retail price"
            description="The storefront only shows a strike-through badge when the MSRP is higher than the price."
          />
        )}
        {margin.warnings.includes('no-cost') && (
          <AlertBanner
            severity="info"
            title="No unit cost on this product"
            description="Margin stays hidden until a cost per item is entered (staff-only field)."
          />
        )}
      </CardContent>
    </Card>
  )
}

export default ProductMarginPanel

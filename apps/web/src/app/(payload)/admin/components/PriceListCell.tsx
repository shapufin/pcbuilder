'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'
import { formatEUR } from '@/components/ui/Price'

/**
 * §5.4 tabular currency cell — EUR-cent number fields rendered via the shared
 * `formatEUR` helper so list prices match storefront formatting. When the row
 * carries `costInEUR` (products wholesale cost) a mock-parity margin subline
 * renders beneath the price (`↗ 25.1% margin`), negative margins flagged.
 */
export const PriceListCell = ({
  cellData,
  rowData,
}: DefaultCellComponentProps): React.JSX.Element => {
  if (typeof cellData !== 'number' || !Number.isFinite(cellData)) {
    return <span className="bmr-cell-empty">—</span>
  }
  const cost = (rowData as Record<string, unknown> | undefined)?.costInEUR
  const margin =
    typeof cost === 'number' && Number.isFinite(cost) && cellData > 0
      ? ((cellData - cost) / cellData) * 100
      : undefined
  return (
    <span className="bmr-price-stack">
      <span className="bmr-price-cell">{formatEUR(cellData)}</span>
      {margin !== undefined ? (
        <span
          className={`bmr-price-cell__margin${
            margin < 0 ? ' bmr-price-cell__margin--negative' : ''
          }`}
        >
          {margin < 0 ? '↘' : '↗'} {margin.toFixed(1)}% margin
        </span>
      ) : null}
    </span>
  )
}

'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * Mock-parity `STOCK` cell — tabular "N in stock" readout. Products with
 * inventory tracking disabled read "Untracked"; missing data renders `—`.
 */
export const StockCell = ({
  cellData,
  rowData,
}: DefaultCellComponentProps): React.JSX.Element => {
  const data = (rowData as Record<string, unknown>) ?? {}
  if (data.trackQuantity === false) {
    return <span className="bmr-stock-cell bmr-stock-cell--untracked">Untracked</span>
  }
  if (typeof cellData !== 'number' || !Number.isFinite(cellData)) {
    return <span className="bmr-cell-empty">—</span>
  }
  return (
    <span className="bmr-stock-cell">
      <span className="bmr-stock-cell__count">{cellData}</span> in stock
    </span>
  )
}

'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

const TONES = new Set(['draft', 'published', 'pending', 'approved', 'rejected', 'held', 'converted', 'released', 'active', 'archived'])

/**
 * Mock-parity `STATUS` cell — functional status pill (the only sanctioned
 * pill per the zero-pill metadata axiom). Unknown values render a neutral pill.
 */
export const StatusPillCell = ({
  cellData,
  rowData,
}: DefaultCellComponentProps): React.JSX.Element => {
  // Mounted on a real field the cell reads cellData; on the injected `_bmrStatus`
  // ui column it reads `rowData._status` (version fields aren't in `fields` at
  // config-transform time, so they can't carry a Cell override directly).
  const raw = typeof cellData === 'string' && cellData !== '' ? cellData : (rowData as Record<string, unknown> | undefined)?._status
  if (typeof raw !== 'string' || raw === '') {
    return <span className="bmr-cell-empty">—</span>
  }
  const tone = TONES.has(raw) ? raw : 'neutral'
  return (
    <span className={`bmr-status-pill bmr-status-pill--${tone}`}>
      <span className="bmr-status-pill__dot" aria-hidden="true" />
      {raw.toUpperCase()}
    </span>
  )
}

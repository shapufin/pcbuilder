'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/** Mock-parity `ID` cell — monospace `#id` token. On the injected `_bmrId` ui column it reads `rowData.id`. */
export const IdCell = ({
  cellData,
  rowData,
}: DefaultCellComponentProps): React.JSX.Element => {
  const raw = cellData ?? (rowData as Record<string, unknown> | undefined)?.id
  if (raw == null || raw === '') {
    return <span className="bmr-cell-empty">—</span>
  }
  return <code className="bmr-id-cell">#{String(raw)}</code>
}

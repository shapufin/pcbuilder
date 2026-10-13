'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'
import { TableCodeChip } from '../ui/TableCompound'

/**
 * §5.4 monospace code chip cell — SKUs, slugs, discount codes, socket labels.
 */
export const CodeChipCell = ({ cellData }: DefaultCellComponentProps): React.JSX.Element => {
  if (cellData == null || cellData === '') {
    return <span className="bmr-cell-empty">—</span>
  }
  return <TableCodeChip code={String(cellData)} />
}

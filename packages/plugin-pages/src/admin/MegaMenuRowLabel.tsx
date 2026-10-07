'use client'

import React from 'react'
import { useRowLabel } from '@payloadcms/ui'

type RowData = {
  title?: unknown
  label?: unknown
  items?: unknown
}

/**
 * Collapsed-row label for the mega-menu global's `sections` and `items`
 * arrays — shows the row's title/label (plus item count for sections) instead
 * of the generic "Section 03" placeholder.
 */
export const MegaMenuRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<RowData>()
  const title =
    (typeof data?.title === 'string' && data.title.trim()) ||
    (typeof data?.label === 'string' && data.label.trim()) ||
    ''
  const itemCount = Array.isArray(data?.items) ? data.items.length : null
  return (
    <span>
      {title || `Row ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}
      {itemCount != null ? ` · ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
    </span>
  )
}

export default MegaMenuRowLabel

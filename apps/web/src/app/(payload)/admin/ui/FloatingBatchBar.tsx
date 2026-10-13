'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

export interface FloatingBatchBarProps {
  selectedCount: number
  onDeselectAll?: () => void
  children?: React.ReactNode
  className?: string
}

export const FloatingBatchBar: React.FC<FloatingBatchBarProps> = ({
  selectedCount,
  onDeselectAll,
  children,
  className,
}) => {
  if (selectedCount <= 0) return null

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions toolbar"
      className={clsx('bmr-batch-bar', className)}
    >
      <div className="bmr-batch-bar__count">
        <span className="bmr-batch-bar__count-badge">{selectedCount}</span>
        <span>selected</span>
      </div>

      <div className="bmr-batch-bar__separator" />

      {children && <div className="bmr-batch-bar__actions">{children}</div>}

      {onDeselectAll && (
        <button
          type="button"
          onClick={onDeselectAll}
          className="bmr-batch-bar__dismiss"
          aria-label="Deselect all"
        >
          <X className="bmr-batch-bar__dismiss-icon" />
          <span>Clear selection</span>
        </button>
      )}
    </div>
  )
}

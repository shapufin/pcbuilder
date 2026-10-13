import * as React from 'react'
import { clsx } from 'clsx'

/**
 * High-Density Table Compound Primitives
 * Conforms to AdminGUI/Design.md Section 5.4 specification.
 */

// 1. Entity Cell: Avatar / Monogram + Primary Label + Sublabel (SKU / Code)
export interface TableEntityCellProps extends React.HTMLAttributes<HTMLDivElement> {
  avatar?: React.ReactNode
  initials?: string
  title: string
  subtitle?: string
}

export const TableEntityCell = React.forwardRef<HTMLDivElement, TableEntityCellProps>(
  ({ className, avatar, initials, title, subtitle, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx('bmr-table-entity-cell', className)} {...props}>
        {avatar ? (
          <div className="bmr-table-entity-cell__avatar">{avatar}</div>
        ) : initials ? (
          <div className="bmr-table-entity-cell__initials" aria-hidden="true">
            {initials.slice(0, 2).toUpperCase()}
          </div>
        ) : null}
        <div className="bmr-table-entity-cell__content">
          <span className="bmr-table-entity-cell__title">{title}</span>
          {subtitle && <span className="bmr-table-entity-cell__subtitle">{subtitle}</span>}
        </div>
      </div>
    )
  },
)
TableEntityCell.displayName = 'TableEntityCell'

// 2. Monospace Code Chip
export interface TableCodeChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  code: string
}

export const TableCodeChip = React.forwardRef<HTMLSpanElement, TableCodeChipProps>(
  ({ className, code, ...props }, ref) => {
    return (
      <span ref={ref} className={clsx('bmr-table-code-chip', className)} {...props}>
        <code>{code}</code>
      </span>
    )
  },
)
TableCodeChip.displayName = 'TableCodeChip'

// 3. Status Badge with Indicator Dot
export type TableStatusVariant = 'active' | 'inactive' | 'draft' | 'warning' | 'error' | 'info'

export interface TableStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TableStatusVariant
  label?: string
}

export const TableStatusBadge = React.forwardRef<HTMLSpanElement, TableStatusBadgeProps>(
  ({ className, status, label, ...props }, ref) => {
    const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1)
    return (
      <span
        ref={ref}
        className={clsx('bmr-table-status', `bmr-table-status--${status}`, className)}
        {...props}
      >
        <span className="bmr-table-status__dot" aria-hidden="true" />
        <span className="bmr-table-status__label">{displayLabel}</span>
      </span>
    )
  },
)
TableStatusBadge.displayName = 'TableStatusBadge'

// 4. Action Strip for inline row actions (Pencil, Trash, ExternalLink)
export type TableActionStripProps = React.HTMLAttributes<HTMLDivElement>

export const TableActionStrip = React.forwardRef<HTMLDivElement, TableActionStripProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx('bmr-table-action-strip', className)} {...props}>
        {children}
      </div>
    )
  },
)
TableActionStrip.displayName = 'TableActionStrip'

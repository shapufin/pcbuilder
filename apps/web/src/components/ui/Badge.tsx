import type { ReactNode } from 'react'

type BadgeVariant = 'muted' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Status badge — carries meaning with an outlined label (never color
 * alone; the previous account page signaled order status by color only).
 */
export function Badge({
  variant = 'muted',
  children,
}: {
  variant?: BadgeVariant
  children: ReactNode
}) {
  return (
    <span className={variant === 'muted' ? 'badge' : `badge badge--${variant}`}>
      {children}
    </span>
  )
}

/** Map order status strings to a badge variant — shared logic, one place. */
export function statusVariant(status: string | null | undefined): BadgeVariant {
  switch (status) {
    case 'completed':
      return 'success'
    case 'processing':
      return 'warning'
    case 'cancelled':
    case 'refunded':
      return 'danger'
    default:
      return 'muted'
  }
}

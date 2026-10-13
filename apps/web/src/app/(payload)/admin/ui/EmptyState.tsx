import * as React from 'react'
import { clsx } from 'clsx'

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx('bmr-empty-state', className)} {...props}>
        {icon && <div className="bmr-empty-state__icon">{icon}</div>}
        <h4 className="bmr-empty-state__title">{title}</h4>
        {description && <p className="bmr-empty-state__description">{description}</p>}
        {action && <div className="bmr-empty-state__action">{action}</div>}
      </div>
    )
  },
)

EmptyState.displayName = 'EmptyState'

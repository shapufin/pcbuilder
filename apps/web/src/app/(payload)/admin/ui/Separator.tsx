import * as React from 'react'
import { clsx } from 'clsx'

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={clsx(
        'bmr-separator',
        orientation === 'vertical' ? 'bmr-separator--vertical' : 'bmr-separator--horizontal',
        className,
      )}
      {...props}
    />
  ),
)
Separator.displayName = 'Separator'

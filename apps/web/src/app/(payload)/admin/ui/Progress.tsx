import * as React from 'react'
import { clsx } from 'clsx'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorClassName?: string
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={clsx('bmr-progress', className)}
        {...props}
      >
        <div
          className={clsx('bmr-progress__bar', indicatorClassName)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  },
)

Progress.displayName = 'Progress'

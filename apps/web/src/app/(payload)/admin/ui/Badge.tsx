import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

export const badgeVariants = cva('bmr-badge', {
  variants: {
    variant: {
      default: 'bmr-badge--default',
      success: 'bmr-badge--success',
      warning: 'bmr-badge--warning',
      destructive: 'bmr-badge--destructive',
      info: 'bmr-badge--info',
      secondary: 'bmr-badge--secondary',
      muted: 'bmr-badge--muted',
      outline: 'bmr-badge--outline',
      subtle: 'bmr-badge--subtle',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulse?: boolean
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, dot = false, pulse = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(badgeVariants({ variant }), className)}
        {...props}
      >
        {dot && (
          <span
            className={clsx('bmr-badge__dot', pulse && 'bmr-badge__dot--pulse')}
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    )
  },
)

Badge.displayName = 'Badge'

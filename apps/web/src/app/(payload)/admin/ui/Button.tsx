'use client'

import * as React from 'react'
import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

export const buttonVariants = cva('bmr-btn', {
  variants: {
    variant: {
      primary: 'bmr-btn--primary',
      secondary: 'bmr-btn--secondary',
      outline: 'bmr-btn--outline',
      ghost: 'bmr-btn--ghost',
      destructive: 'bmr-btn--destructive',
      subtle: 'bmr-btn--subtle',
      link: 'bmr-btn--link',
    },
    size: {
      sm: 'bmr-btn--sm',
      md: 'bmr-btn--md',
      lg: 'bmr-btn--lg',
      icon: 'bmr-btn--icon',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

/**
 * DOCTRINE: Never wrap <Button> in <Link>. Use <Button href="..."> directly.
 * Wrapping <Button> inside Next.js <Link> produces invalid HTML5 (nested interactive
 * elements <a href><button>), breaking accessibility, hydration, and event bubbling.
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  href?: string
  loading?: boolean
  target?: string
  rel?: string
}

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant, size, loading = false, href, children, disabled, ...props }, ref) => {
    const combinedClassName = clsx(
      buttonVariants({ variant, size }),
      loading && 'bmr-btn--loading',
      className,
    )

    if (href) {
      return (
        <Link
          href={disabled ? '#' : href}
          className={clsx(combinedClassName, disabled && 'bmr-btn--disabled')}
          ref={ref as React.Ref<HTMLAnchorElement>}
          aria-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : undefined}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {loading && <span className="bmr-btn__spinner" aria-hidden="true" />}
          {children}
        </Link>
      )
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={combinedClassName}
        disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        {...props}
      >
        {loading && <span className="bmr-btn__spinner" aria-hidden="true" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

import Link from 'next/link'
import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

type BaseProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  className?: string
  children: ReactNode
}

type ButtonProps = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined
  }

type LinkButtonProps = BaseProps & {
  href: string
  onClick?: () => void
  'aria-label'?: string
}

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ')

/**
 * Phase-0 redesign primitive: one button/link-button for the whole
 * storefront — replaces the ~15 ad-hoc style objects (payBtn, qtyBtn,
 * ctaPrimary/Secondary…) that couldn't express hover/focus states as
 * inline styles. Renders <Link> when href is set so real navigation keeps
 * Cmd/Ctrl+click + middle-click.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  ...rest
}: ButtonProps | LinkButtonProps) {
  const cls = cx(
    'btn',
    variant !== 'primary' && `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    loading && 'btn--loading',
    className,
  )
  const content = (
    <>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </>
  )

  if ('href' in rest && rest.href != null) {
    const { href, onClick, ...linkRest } = rest as LinkButtonProps
    return (
      <Link href={href} className={cls} onClick={onClick} {...linkRest}>
        {content}
      </Link>
    )
  }

  const { disabled, type = 'button', ...btnRest } = rest as ButtonProps
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...btnRest}
    >
      {content}
    </button>
  )
}

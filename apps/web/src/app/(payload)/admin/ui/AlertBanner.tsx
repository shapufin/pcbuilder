import React from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight, X } from 'lucide-react'

export interface AlertBannerProps {
  severity?: 'warning' | 'critical' | 'info' | 'success'
  badge?: string
  title: string
  description: string
  counter?: string
  action?: {
    label: string
    href: string
    /** Opens in a new tab with noopener — for storefront-facing links from edit views. */
    external?: boolean
  }
  onDismiss?: () => void
  icon?: React.ComponentType<{ className?: string; size?: number }>
  className?: string
}

const DEFAULT_ICONS = {
  warning: AlertTriangle,
  critical: AlertCircle,
  info: Info,
  success: CheckCircle2,
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  severity = 'info',
  badge,
  title,
  description,
  counter,
  action,
  onDismiss,
  icon,
  className,
}) => {
  const Icon = icon || DEFAULT_ICONS[severity]

  return (
    <div
      role="alert"
      className={clsx(
        'bmr-alert-banner',
        `bmr-alert-banner--${severity}`,
        className
      )}
    >
      <div className="bmr-alert-banner__content">
        <div className="bmr-alert-banner__icon-box">
          <Icon size={18} />
        </div>

        <div className="bmr-alert-banner__text-group">
          <div className="bmr-alert-banner__header">
            {badge && <span className="bmr-alert-banner__badge">{badge}</span>}
            <span className="bmr-alert-banner__title">{title}</span>
          </div>
          <p className="bmr-alert-banner__desc">{description}</p>
        </div>
      </div>

      <div className="bmr-alert-banner__actions">
        {counter && <span className="bmr-alert-banner__counter">{counter}</span>}

        {action && (
          <Link
            href={action.href}
            className="bmr-alert-banner__action-btn"
            target={action.external ? '_blank' : undefined}
            rel={action.external ? 'noopener noreferrer' : undefined}
          >
            <span>{action.label}</span>
            <ChevronRight size={14} />
          </Link>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="bmr-alert-banner__close-btn"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

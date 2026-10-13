import React from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'

export interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    label: string
  }
  icon?: React.ComponentType<{ className?: string; size?: number }>
  href?: string
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon: Icon,
  href,
  className,
}) => {
  const content = (
    <div className={clsx('bmr-metric-card', href && 'bmr-metric-card--interactive', className)}>
      <div className="bmr-metric-card__header">
        <span className="bmr-metric-card__label">{label}</span>
        {Icon && (
          <div className="bmr-metric-card__icon-box">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="bmr-metric-card__body">
        <div className="bmr-metric-card__value">{value}</div>
        {trend && (
          <div className={clsx('bmr-metric-card__trend', `bmr-metric-card__trend--${trend.direction}`)}>
            {trend.direction === 'up' && <ArrowUpRight size={14} className="bmr-metric-card__trend-arrow" />}
            {trend.direction === 'down' && <ArrowDownRight size={14} className="bmr-metric-card__trend-arrow" />}
            <span>{trend.label}</span>
          </div>
        )}
      </div>

      {(subtext || href) && (
        <div className="bmr-metric-card__footer">
          {subtext && <span className="bmr-metric-card__subtext">{subtext}</span>}
          {href && (
            <span className="bmr-metric-card__arrow">
              <ArrowRight size={14} />
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="bmr-metric-card-link">
        {content}
      </Link>
    )
  }

  return content
}

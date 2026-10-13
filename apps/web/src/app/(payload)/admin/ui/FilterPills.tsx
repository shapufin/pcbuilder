import React from 'react'
import { clsx } from 'clsx'

export interface FilterPillItem {
  id: string
  label: string
  count?: number | string
  icon?: React.ComponentType<{ className?: string; size?: number }>
}

export interface FilterPillsProps {
  items: FilterPillItem[]
  activeId: string
  onChange: (id: string) => void
  size?: 'sm' | 'md'
  className?: string
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  items,
  activeId,
  onChange,
  size = 'md',
  className,
}) => {
  return (
    <div
      role="tablist"
      className={clsx('bmr-filter-pills', `bmr-filter-pills--${size}`, className)}
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        const Icon = item.icon

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={clsx(
              'bmr-filter-pill',
              isActive && 'bmr-filter-pill--active'
            )}
            onClick={() => onChange(item.id)}
          >
            {Icon && <Icon size={14} className="bmr-filter-pill__icon" />}
            <span className="bmr-filter-pill__label">{item.label}</span>
            {item.count !== undefined && (
              <span className="bmr-filter-pill__count">{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

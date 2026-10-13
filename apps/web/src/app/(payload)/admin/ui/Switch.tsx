'use client'

import * as React from 'react'
import { clsx } from 'clsx'

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: React.ReactNode
  checked?: boolean
  readOnly?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      label,
      checked = false,
      onCheckedChange,
      disabled,
      readOnly = false,
      onClick,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId()
    const switchId = id || generatedId

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || readOnly) return
      onCheckedChange?.(!checked)
      onClick?.(e)
    }

    return (
      <div className={clsx('bmr-switch', checked && 'bmr-switch--checked', disabled && 'bmr-switch--disabled', className)}>
        <button
          type="button"
          role="switch"
          id={switchId}
          ref={ref}
          aria-checked={checked}
          disabled={disabled}
          onClick={handleClick}
          className="bmr-switch__track"
          {...props}
        >
          <span className="bmr-switch__thumb" aria-hidden="true" />
        </button>
        {label && (
          <label htmlFor={switchId} className="bmr-switch__label">
            {label}
          </label>
        )}
      </div>
    )
  },
)

Switch.displayName = 'Switch'

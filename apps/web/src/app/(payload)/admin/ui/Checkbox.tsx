import * as React from 'react'
import { clsx } from 'clsx'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, disabled, checked, ...props }, ref) => {
    const generatedId = React.useId()
    const checkboxId = id || generatedId

    return (
      <label
        htmlFor={checkboxId}
        className={clsx('bmr-checkbox', disabled && 'bmr-checkbox--disabled', className)}
      >
        <input
          id={checkboxId}
          type="checkbox"
          ref={ref}
          disabled={disabled}
          checked={checked}
          className="bmr-checkbox__input"
          {...props}
        />
        <span className="bmr-checkbox__box" aria-hidden="true">
          <Check size={12} strokeWidth={3} />
        </span>
        {label && <span className="bmr-checkbox__label">{label}</span>}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'

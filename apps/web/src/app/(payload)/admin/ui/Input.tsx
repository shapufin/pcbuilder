import * as React from 'react'
import { clsx } from 'clsx'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode
  helperText?: React.ReactNode
  error?: React.ReactNode
  prefixSlot?: React.ReactNode
  suffixSlot?: React.ReactNode
  containerClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      helperText,
      error,
      required,
      id,
      prefixSlot,
      suffixSlot,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId()
    const inputId = id || (label ? generatedId : undefined)

    const content = (
      <div
        className={clsx(
          'bmr-input-container',
          error && 'bmr-input-container--error',
          containerClassName,
        )}
      >
        {prefixSlot && <span className="bmr-input__prefix">{prefixSlot}</span>}
        <input
          id={inputId}
          ref={ref}
          required={required}
          disabled={disabled}
          className={clsx('bmr-input', className)}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {suffixSlot && <span className="bmr-input__suffix">{suffixSlot}</span>}
      </div>
    )

    if (!label && !helperText && !error) {
      return content
    }

    return (
      <div className="bmr-input-wrapper">
        {label && (
          <label htmlFor={inputId} className="bmr-input-label">
            {label}
            {required && <span className="bmr-input-label__required">*</span>}
          </label>
        )}
        {content}
        {error && (
          <span className="bmr-input-error" role="alert">
            {error}
          </span>
        )}
        {!error && helperText && <span className="bmr-input-helper">{helperText}</span>}
      </div>
    )
  },
)

Input.displayName = 'Input'

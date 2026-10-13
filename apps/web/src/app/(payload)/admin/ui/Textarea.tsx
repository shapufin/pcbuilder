import * as React from 'react'
import { clsx } from 'clsx'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode
  helperText?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, required, id, disabled, ...props }, ref) => {
    const generatedId = React.useId()
    const textareaId = id || (label ? generatedId : undefined)

    const textarea = (
      <textarea
        id={textareaId}
        ref={ref}
        required={required}
        disabled={disabled}
        className={clsx('bmr-textarea', error && 'bmr-textarea--error', className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    )

    if (!label && !helperText && !error) {
      return textarea
    }

    return (
      <div className="bmr-input-wrapper">
        {label && (
          <label htmlFor={textareaId} className="bmr-input-label">
            {label}
            {required && <span className="bmr-input-label__required">*</span>}
          </label>
        )}
        {textarea}
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

Textarea.displayName = 'Textarea'

'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
} | null>(null)

export function useDialog() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within Dialog')
  }
  return context
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { onOpenChange } = useDialog()
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onOpenChange(true)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
DialogTrigger.displayName = 'DialogTrigger'

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    const { open, onOpenChange } = useDialog()

    const handleClose = React.useCallback(() => {
      onOpenChange(false)
      onClose?.()
    }, [onOpenChange, onClose])

    // Escape closes the dialog — standard modal affordance the primitive
    // was missing (audited: rule-matrix dialogs ignored Esc entirely).
    React.useEffect(() => {
      if (!open) return
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          handleClose()
        }
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }, [open, handleClose])

    if (!open) return null

    return (
      <div className="bmr-dialog-backdrop">
        <div className="bmr-dialog-container" onClick={handleClose}>
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            className={clsx('bmr-dialog', className)}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {children}
            <button
              type="button"
              onClick={handleClose}
              className="bmr-dialog__close"
              aria-label="Close dialog"
            >
              <X className="bmr-dialog__close-icon" />
            </button>
          </div>
        </div>
      </div>
    )
  },
)
DialogContent.displayName = 'DialogContent'

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('bmr-dialog__header', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('bmr-dialog__footer', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={clsx('bmr-dialog__title', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={clsx('bmr-dialog__description', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

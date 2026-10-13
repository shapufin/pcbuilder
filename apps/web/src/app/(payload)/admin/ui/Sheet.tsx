'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

const SheetContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
} | null>(null)

export function useSheet() {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error('useSheet must be used within Sheet')
  }
  return context
}

export const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, children }) => {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'right' | 'left'
  onClose?: () => void
}

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, side = 'right', children, onClose, ...props }, ref) => {
    const { open, onOpenChange } = useSheet()

    if (!open) return null

    const handleClose = () => {
      onOpenChange(false)
      onClose?.()
    }

    return (
      <div className="bmr-sheet-backdrop">
        <div className="bmr-sheet-container" onClick={handleClose}>
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            className={clsx('bmr-sheet', `bmr-sheet--${side}`, className)}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            <button
              type="button"
              onClick={handleClose}
              className="bmr-sheet__close"
              aria-label="Close sheet"
            >
              <X className="bmr-sheet__close-icon" />
            </button>
            {children}
          </div>
        </div>
      </div>
    )
  },
)
SheetContent.displayName = 'SheetContent'

export const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('bmr-sheet__header', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

export const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={clsx('bmr-sheet__title', className)} {...props} />
))
SheetTitle.displayName = 'SheetTitle'

export const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={clsx('bmr-sheet__description', className)} {...props} />
))
SheetDescription.displayName = 'SheetDescription'

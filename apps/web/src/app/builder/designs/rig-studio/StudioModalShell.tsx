'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Shared a11y chrome for rig-studio dialogs (entry 50 P4) — the same contract
 * StudioSwapModal implements inline: Escape + backdrop close, initial focus
 * on the close button + restore on dismount, body scroll-lock, role="dialog".
 * `wide` widens the panel for list-heavy modals (SavedBuilds).
 */
export function StudioModalShell({
  title,
  subtitle,
  icon,
  onClose,
  wide,
  children,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="studio-modal">
      <button
        type="button"
        className="studio-modal__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className={`studio-modal__panel${wide ? ' studio-modal__panel--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="studio-modal__head">
          {icon ? (
            <span className="studio-modal__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="studio-modal__titles">
            <h3 id={titleId} className="studio-modal__title">
              {title}
            </h3>
            {subtitle ? <p className="studio-modal__current">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            ref={closeRef}
            className="studio-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The open drawer, presentational so the a11y contract is testable without
 * hydrating (same split as CartDrawerOverlay). Filter links navigate, so
 * consumers whose content anchors somewhere new get close-on-navigation;
 * live-filter content (builder) just stays open until ×/Escape/backdrop.
 */
export function FilterDrawerPanel({
  label = 'Product filters',
  onClose,
  closeRef,
  children,
}: {
  label?: string
  onClose: () => void
  closeRef?: React.Ref<HTMLButtonElement>
  children: React.ReactNode
}) {
  return (
    <div className="filter-drawer__backdrop" onClick={onClose}>
      <div
        id="filter-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="filter-drawer__panel"
        onClick={(e) => {
          e.stopPropagation()
          // Filter links navigate — close the drawer underneath them.
          if ((e.target as HTMLElement).closest('a')) onClose()
        }}
      >
        <div className="filter-drawer__head">
          <h2>Filters</h2>
          <button
            ref={closeRef}
            type="button"
            className="cart-drawer__close"
            aria-label="Close filters"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Mobile-only filter drawer. The same filters render twice: once in the
 * persistent desktop layout, once here inside a dialog — CSS hides the
 * inactive copy per breakpoint.
 */
export function FilterDrawer({
  activeCount,
  label,
  children,
}: {
  /** Active-filter count shown as a badge on the trigger (0/undefined → none). */
  activeCount?: number
  /** Dialog aria-label — defaults to "Product filters" (shop). */
  label?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const openRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    // Closing unmounts the dialog (and any focused element inside) — return
    // focus to the trigger or it drops to <body>.
    openRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <>
      <button
        ref={openRef}
        type="button"
        className="btn btn--secondary filter-drawer__open"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="filter-drawer-panel"
        onClick={() => setOpen(true)}
      >
        Filters
        {activeCount ? <span className="filter-drawer__count">{activeCount}</span> : null}
      </button>
      {open ? (
        <FilterDrawerPanel label={label} onClose={close} closeRef={closeRef}>
          {children}
        </FilterDrawerPanel>
      ) : null}
    </>
  )
}

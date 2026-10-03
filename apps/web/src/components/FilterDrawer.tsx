'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Mobile-only filter drawer for the category sidebar. The same <Filters>
 * content renders twice: once in the persistent desktop <aside>, once here
 * inside a dialog — CSS hides the inactive copy per breakpoint. Links inside
 * are plain navigations, so the drawer closes itself when the route changes.
 */
export function FilterDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" className="btn btn--secondary filter-drawer__open" onClick={() => setOpen(true)}>
        Filters
      </button>
      {open ? (
        <div className="filter-drawer__backdrop" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            className="filter-drawer__panel"
            onClick={(e) => {
              e.stopPropagation()
              // Filter links navigate — close the drawer underneath them.
              if ((e.target as HTMLElement).closest('a')) close()
            }}
          >
            <div className="filter-drawer__head">
              <h2>Filters</h2>
              <button
                ref={closeRef}
                type="button"
                className="cart-drawer__close"
                aria-label="Close filters"
                onClick={close}
              >
                ×
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  )
}

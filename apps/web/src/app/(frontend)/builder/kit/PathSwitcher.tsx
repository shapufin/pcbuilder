'use client'

import { useEffect, useRef, useState } from 'react'
import { PATH_BOUND_SLUGS, type PlatformId } from '@buildmyrig/plugin-pc-builder'
import { useBuilder } from '../builder-provider'

/**
 * Shared path switcher (spec §C, entry 68): shows the active platform path and
 * lets the user switch it. Engaging/switching to a path clears the bound slots
 * — the menu warns about that and a confirm guards the destructive switch.
 * Renders nothing when the index offers fewer than two platforms.
 */
export function PathSwitcher() {
  const { state, actions, meta } = useBuilder()
  const { path, categories, selections } = state
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (meta.platforms.length < 2) return null

  const boundIds = new Set(
    categories.filter((c) => (PATH_BOUND_SLUGS as readonly string[]).includes(c.slug)).map((c) => c.id),
  )
  const boundPicks = Object.entries(selections).reduce(
    (n, [catId, ids]) => n + (boundIds.has(catId) ? ids.length : 0),
    0,
  )

  const labelOf = (p: PlatformId | null): string =>
    p === null ? 'All platforms' : `${meta.platforms.find((x) => x.id === p)?.label ?? p} build`

  const pick = (next: PlatformId | null) => {
    if (next === path) {
      setOpen(false)
      return
    }
    if (next !== null && boundPicks > 0) {
      const ok = window.confirm(
        `Switching to ${labelOf(next)} clears your CPU, motherboard, memory and cooling picks. Continue?`,
      )
      if (!ok) return
    }
    actions.setPath(next)
    setOpen(false)
  }

  return (
    <div className="path-switcher" ref={rootRef}>
      <button
        type="button"
        className={`path-switcher__btn${path ? ' path-switcher__btn--active' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Build path — filters CPU, motherboard, memory and cooling"
      >
        {labelOf(path)}
      </button>
      {open && (
        <div className="path-switcher__menu" role="listbox" aria-label="Build path">
          {meta.platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={path === p.id}
              className="path-switcher__opt"
              onClick={() => pick(p.id as PlatformId)}
            >
              {p.label} build
              <span className="path-switcher__hint">{p.sockets.join(' · ')}</span>
            </button>
          ))}
          <button
            type="button"
            role="option"
            aria-selected={path === null}
            className="path-switcher__opt"
            onClick={() => pick(null)}
          >
            All platforms
            <span className="path-switcher__hint">No pre-filter</span>
          </button>
          {boundPicks > 0 && (
            <p className="path-switcher__warn">
              Picking a path clears CPU · motherboard · memory · cooling.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

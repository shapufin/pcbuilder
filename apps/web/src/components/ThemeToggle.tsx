'use client'

import { useSyncExternalStore } from 'react'
import { SunMoon } from 'lucide-react'

const STORAGE_KEY = 'bmr_theme'
const CHANGE_EVENT = 'bmr_theme_change'

// Module-scope: useSyncExternalStore requires stable subscribe/snapshot
// identities across renders.
const subscribe = (cb: () => void) => {
  // 'storage' covers other tabs; CHANGE_EVENT covers our own writes
  // (same-tab localStorage writes emit no 'storage' event).
  window.addEventListener('storage', cb)
  window.addEventListener(CHANGE_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(CHANGE_EVENT, cb)
  }
}
const getSnapshot = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'alt'
  } catch {
    return false
  }
}
const getServerSnapshot = () => false

/**
 * Flip the two injected stylesheets — same media-attr logic as
 * THEME_BOOT_SCRIPT in lib/theme.server.ts (the inline boot script runs
 * before hydration and can't share module imports).
 */
const applyAlt = (alt: boolean) => {
  const vars = document.getElementById('theme-vars') as HTMLStyleElement | null
  const skin = document.getElementById('theme-skin') as HTMLStyleElement | null
  const altEl = document.getElementById('theme-alt') as HTMLStyleElement | null
  if (vars) vars.media = alt ? 'not all' : 'all'
  if (skin) skin.media = alt ? 'not all' : 'all'
  if (altEl) altEl.media = alt ? 'all' : 'not all'
}

/**
 * Visitor-facing theme toggle (entry 60). The layout ships the admin
 * preset plus a complete alt preset (#theme-alt, media="not all") — the
 * toggle just flips media attrs and stores the choice.
 * useSyncExternalStore reads the stored choice during hydration (server
 * snapshot = default), so the label/pressed state reconciles without an
 * effect and the boot script already applied it visually — no flash.
 */
export function ThemeToggle({
  altLabel,
  defaultLabel,
}: {
  altLabel: string
  defaultLabel: string
}) {
  const alt = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = () => {
    const next = !alt
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'alt' : 'default')
    } catch {
      // Still applies for this page view.
    }
    applyAlt(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  const label = alt ? `Switch to ${defaultLabel} theme` : `Switch to ${altLabel} theme`
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={alt}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <SunMoon size={18} aria-hidden />
    </button>
  )
}

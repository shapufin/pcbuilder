'use client'

import React, { useSyncExternalStore } from 'react'
import { Sun, Moon, Zap, Sliders } from 'lucide-react'

const THEMES = [
  { label: '⚡ Modern Slate (Dark)', value: 'precision-dark', icon: Moon },
  { label: '☀️ Enterprise SaaS (Light)', value: 'light-clean', icon: Sun },
  { label: '🌌 Cyber Neon (Tech)', value: 'cyber-neon', icon: Zap },
  { label: '📦 Classic Payload', value: 'classic-payload', icon: Sliders },
] as const

type AdminTheme = (typeof THEMES)[number]['value']

const subscribeTheme = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr-admin-theme-change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr-admin-theme-change', cb)
  }
}

const getThemeSnapshot = (): AdminTheme => {
  try {
    const stored = localStorage.getItem('bmr_admin_theme') as AdminTheme | null
    const rootTheme = document.documentElement.getAttribute('data-admin-theme') as AdminTheme | null
    const val = stored || rootTheme
    if (val && ['precision-dark', 'cyber-neon', 'light-clean', 'classic-payload'].includes(val)) {
      return val
    }
  } catch {}
  return 'precision-dark'
}

const getThemeServerSnapshot = (): AdminTheme => 'precision-dark'

export const AdminHeaderActions: React.FC = () => {
  const currentTheme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as AdminTheme
    document.documentElement.setAttribute('data-admin-theme', next)
    document.documentElement.setAttribute('data-theme', next === 'light-clean' ? 'light' : 'dark')
    try {
      localStorage.setItem('bmr_admin_theme', next)
    } catch {}
    document.cookie = `bmr_admin_theme=${next}; path=/; max-age=31536000; SameSite=Lax`
    window.dispatchEvent(new CustomEvent('bmr-admin-theme-change', { detail: next }))
  }

  return (
    <div className="bmr-header-actions">
      <div className="bmr-theme-select-wrapper">
        <select
          aria-label="Admin GUI Theme"
          className="bmr-theme-select"
          value={currentTheme}
          onChange={handleThemeChange}
        >
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="bmr-header-store-btn"
        title="Open live Storefront in new tab"
      >
        <span>Storefront ↗</span>
      </a>
    </div>
  )
}

export default AdminHeaderActions

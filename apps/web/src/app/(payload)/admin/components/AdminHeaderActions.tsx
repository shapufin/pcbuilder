'use client'

import React, { useState } from 'react'

const THEMES = [
  { label: '⚡ Precision Dark', value: 'precision-dark' },
  { label: '🌌 Cyber Neon', value: 'cyber-neon' },
  { label: '☀️ Light Clean', value: 'light-clean' },
  { label: '📦 Classic Payload', value: 'classic-payload' },
] as const

type AdminTheme = (typeof THEMES)[number]['value']

const getInitialTheme = (): AdminTheme => {
  if (typeof window === 'undefined') return 'precision-dark'
  const stored = localStorage.getItem('bmr_admin_theme') as AdminTheme | null
  const rootTheme = document.documentElement.getAttribute('data-admin-theme') as AdminTheme | null
  return stored || rootTheme || 'precision-dark'
}

export const AdminHeaderActions: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<AdminTheme>(getInitialTheme)

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as AdminTheme
    setCurrentTheme(next)
    document.documentElement.setAttribute('data-admin-theme', next)
    localStorage.setItem('bmr_admin_theme', next)
    // Also save in cookie for server-side initial rendering
    document.cookie = `bmr_admin_theme=${next}; path=/; max-age=31536000; SameSite=Lax`
  }

  return (
    <div className="bmr-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
      <select
        aria-label="Admin GUI Theme"
        className="bmr-theme-select"
        value={currentTheme}
        onChange={handleThemeChange}
        style={{
          background: 'var(--theme-elevation-150, var(--color-surface))',
          color: 'var(--theme-text, var(--color-text))',
          border: '1px solid var(--theme-elevation-300, var(--color-border))',
          borderRadius: 'var(--radius-sm, 6px)',
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {THEMES.map((t) => (
          <option
            key={t.value}
            value={t.value}
            style={{
              background: 'var(--theme-elevation-100, var(--color-surface))',
              color: 'var(--theme-text, var(--color-text))',
            }}
          >
            {t.label}
          </option>
        ))}
      </select>

      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="bmr-store-link"
        title="Open Storefront in new tab"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 700,
          textDecoration: 'none',
          color: 'var(--theme-accent, var(--color-primary))',
          background: 'var(--theme-accent-soft, var(--color-primary-soft))',
          border: '1px solid var(--theme-accent, var(--color-primary))',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm, 6px)',
        }}
      >
        🚀 Storefront ↗
      </a>
    </div>
  )
}

export default AdminHeaderActions

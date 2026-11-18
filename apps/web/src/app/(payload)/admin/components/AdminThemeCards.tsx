'use client'

import React, { useSyncExternalStore } from 'react'
import { useField } from '@payloadcms/ui'
import { Check, Sparkles } from 'lucide-react'
import { ADMIN_THEMES_CATALOG, selectAdminTheme } from './adminTheme.ts'

/**
 * Visual admin-skin switcher, mounted as a `ui` field inside the site-settings
 * form so `useField` resolves the real document field.
 *
 * It used to live in the `elements.Description` header, which Payload renders
 * OUTSIDE `<Form>` — there `useField().setValue` was undefined, so every card
 * click threw `D is not a function` and the choice was never saved (audit
 * 2026-10-22, #668).
 */

const THEME_IDS = ADMIN_THEMES_CATALOG.map((t) => t.id)

const subscribeTheme = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr-admin-theme-change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr-admin-theme-change', cb)
  }
}

const getThemeSnapshot = (): string => {
  try {
    const stored = localStorage.getItem('bmr_admin_theme')
    const rootTheme = document.documentElement.getAttribute('data-admin-theme')
    const val = stored || rootTheme
    if (val && THEME_IDS.includes(val as never)) return val
  } catch {}
  return 'precision-dark'
}

const getThemeServerSnapshot = (): string => 'precision-dark'

export const AdminThemeCards: React.FC = () => {
  const { value, setValue } = useField<string>({ path: 'adminTheme' })
  const activeTheme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)
  const effectiveTheme = (typeof value === 'string' && value) || activeTheme

  return (
    <div className="bmr-color-studio bmr-theme-cards-1">
      <div className="bmr-color-studio__header">
        <div className="bmr-color-studio__title-wrap">
          <div className="bmr-color-studio__badge">
            <Sparkles size={14} />
            <span>Admin Back-Office Skins</span>
          </div>
          <h3 className="bmr-color-studio__title">Visual Theme Switcher &amp; Preview</h3>
          <p className="bmr-color-studio__desc">
            Select an admin GUI skin. Click a card to instantly apply the theme and sync it to the
            form field.
          </p>
        </div>
      </div>

      <div className="bmr-admin-themes-grid">
        {ADMIN_THEMES_CATALOG.map((t) => {
          const isActive = effectiveTheme === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectAdminTheme(t.id, setValue)}
              className={`bmr-admin-theme-card ${isActive ? 'bmr-admin-theme-card--active' : ''}`}
              aria-pressed={isActive}
            >
              <div className="bmr-theme-card__swatches">
                <span className="bmr-theme-card__swatch" style={{ backgroundColor: t.bg }} />
                <span className="bmr-theme-card__swatch" style={{ backgroundColor: t.surface }} />
                <span className="bmr-theme-card__swatch" style={{ backgroundColor: t.accent }} />
                {isActive && (
                  <span className="bmr-theme-cards-2">
                    <Check size={14} />
                  </span>
                )}
              </div>
              <div className="bmr-theme-card__title">{t.label}</div>
              <div className="bmr-theme-card__desc">{t.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AdminThemeCards

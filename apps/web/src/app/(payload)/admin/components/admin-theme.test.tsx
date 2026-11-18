import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { AdminThemeSync, adminThemeFromSaveResponse } from './AdminThemeSync'
import { AdminHeaderActions } from './AdminHeaderActions'
import { ADMIN_THEMES_CATALOG, payloadThemeFor } from './adminTheme.ts'

describe('Admin Theme System — SSR & Contract', () => {
  it('#456 AdminThemeSync emits no DOM markup on SSR (protects hydration integrity)', () => {
    const html = renderToStaticMarkup(<AdminThemeSync />)
    expect(html).toBe('')
  })

  it('#457 AdminHeaderActions renders all 4 skin options and secure storefront link', () => {
    const html = renderToStaticMarkup(<AdminHeaderActions />)

    // A11y & Controls
    expect(html).toContain('aria-label="Admin GUI Theme"')
    expect(html).toContain('class="bmr-theme-select"')

    // All 4 skin choices present
    expect(html).toContain('value="precision-dark"')
    expect(html).toContain('value="cyber-neon"')
    expect(html).toContain('value="light-clean"')
    expect(html).toContain('value="classic-payload"')

    // Secure Storefront launcher
    expect(html).toContain('href="/"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('Storefront ↗')
  })

  it('#567 adminThemeFromSaveResponse applies POST saves only — GET reads never restyle the console', () => {
    // Entry 110: the site-settings edit header telemetry-fetches the global via
    // window.fetch — the AdminThemeSync interceptor must not treat that read as
    // a theme save and clobber the admin's local skin selection.
    const url = '/api/globals/site-settings'
    expect(adminThemeFromSaveResponse(url, 'GET', { adminTheme: 'cyber-neon' })).toBeNull()
    expect(adminThemeFromSaveResponse(url, undefined, { adminTheme: 'cyber-neon' })).toBeNull()
    expect(adminThemeFromSaveResponse(url, 'POST', { adminTheme: 'cyber-neon' })).toBe('cyber-neon')
    expect(adminThemeFromSaveResponse(url, 'post', { doc: { adminTheme: 'light-clean' } })).toBe('light-clean')
    expect(adminThemeFromSaveResponse(url, 'POST', { adminTheme: 'bogus' })).toBeNull()
    expect(adminThemeFromSaveResponse('/api/globals/theme', 'POST', { adminTheme: 'cyber-neon' })).toBeNull()
  })

  it('#678 maps every skin to the Payload colour mode its native components expect', () => {
    // Payload's ThemeProvider drives data-theme + the payload-theme cookie; if it
    // disagrees with the skin, its Monaco editor renders light-on-dark.
    expect(payloadThemeFor('light-clean')).toBe('light')
    expect(payloadThemeFor('aether-frost')).toBe('light')
    expect(payloadThemeFor('precision-dark')).toBe('dark')
    expect(payloadThemeFor('aether-foundry')).toBe('dark')
    expect(payloadThemeFor('cyber-neon')).toBe('dark')
    expect(payloadThemeFor('classic-payload')).toBe('dark')
    // every catalog entry is covered (no skin can fall through to a stale mode)
    for (const skin of ADMIN_THEMES_CATALOG) {
      expect(['dark', 'light']).toContain(payloadThemeFor(skin.id))
    }
  })
})

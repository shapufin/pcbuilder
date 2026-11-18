import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteSettingsHeader, selectAdminTheme } from './SiteSettingsHeader.tsx'

// The header no longer reads form state (audit #668 moved the skin cards into a
// `ui` field), so @payloadcms/ui is not mocked here on purpose — if a useField
// call creeps back into elements.Description territory, this render throws.

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/globals/site-settings',
  useSearchParams: () => new URLSearchParams(),
}))

describe('SiteSettingsHeader (#555 - #559)', () => {
  it('#555 renders 4-card telemetry ribbon with default site settings stats', () => {
    const html = renderToStaticMarkup(<SiteSettingsHeader />)
    expect(html).toContain('HEADER LINKS')
    expect(html).toContain('FOOTER LINKS')
    expect(html).toContain('ANNOUNCEMENTS')
    expect(html).toContain('ADMIN SKIN')
    expect(html).toContain('Precision Dark')
  })

  it('#556 renders custom settings stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <SiteSettingsHeader
        stats={{
          navLinksCount: 7,
          footerLinksCount: 9,
          announcementsCount: 4,
          adminThemeLabel: 'Cyber Neon',
        }}
      />
    )
    expect(html).toContain('7')
    expect(html).toContain('9')
    expect(html).toContain('4')
    expect(html).toContain('Cyber Neon')
  })

  it('#557 renders operational AlertBanner with storefront propagation notice', () => {
    const html = renderToStaticMarkup(<SiteSettingsHeader />)
    expect(html).toContain('Storefront Propagation &amp; Layout Revalidation')
    expect(html).toContain('root layout on save')
    expect(html).toContain('View Storefront')
  })

  it('#558 renders header actions including Theme, Mega Menu, and Storefront links', () => {
    const html = renderToStaticMarkup(<SiteSettingsHeader />)
    expect(html).toContain('Theme ↗')
    expect(html).toContain('Mega Menu ↗')
    expect(html).toContain('Storefront ↗')
    // Storefront-facing links open a new tab so unsaved global edits aren't lost
    // (consistent with the sibling list-header convention).
    expect(html).toContain('target="_blank" rel="noopener noreferrer" href="/"')
  })

  it('#559 renders global scope badge, environment scope chip, and subtitle', () => {
    const html = renderToStaticMarkup(<SiteSettingsHeader />)
    expect(html).toContain('Global Settings')
    expect(html).toContain('Settings &amp; Design · Environment')
    expect(html).toContain('Storefront identity, header &amp; footer navigation, announcement telemetry')
  })

  it('#560 the header renders without any form context (no useField)', () => {
    // Regression guard for #668: mounting useField on elements.Description threw
    // "x is not a function" on every load of the global edit view.
    expect(() => renderToStaticMarkup(<SiteSettingsHeader />)).not.toThrow()
    const html = renderToStaticMarkup(<SiteSettingsHeader />)
    expect(html).not.toContain('bmr-admin-theme-card')
  })

  it('#669 selectAdminTheme syncs the field when a setter is available', () => {
    const setter = vi.fn()
    selectAdminTheme('aether-foundry', setter)
    expect(setter).toHaveBeenCalledWith('aether-foundry')
    // No setter (outside a form) must not throw.
    expect(() => selectAdminTheme('cyber-neon')).not.toThrow()
  })
})

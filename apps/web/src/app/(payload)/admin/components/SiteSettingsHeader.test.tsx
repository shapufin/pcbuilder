import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteSettingsHeader } from './SiteSettingsHeader.tsx'

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
})

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MegaMenuHeader, megaMenuStatsFromDoc } from './MegaMenuHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/globals/mega-menu',
  useSearchParams: () => new URLSearchParams(),
}))

describe('MegaMenuHeader (#573 - #577)', () => {
  it('#573 renders 4-card telemetry ribbon with default mega-menu stats', () => {
    const html = renderToStaticMarkup(<MegaMenuHeader />)
    expect(html).toContain('FLYOUT SECTIONS')
    expect(html).toContain('MENU ITEMS')
    expect(html).toContain('PROMO CARDS')
    expect(html).toContain('MENU STATUS')
  })

  it('#574 renders custom mega-menu stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <MegaMenuHeader
        stats={{
          sectionsCount: 4,
          itemsCount: 17,
          promoCount: 2,
          menuStatus: 'Hidden',
        }}
      />
    )
    expect(html).toContain('4')
    expect(html).toContain('17')
    expect(html).toContain('2')
    expect(html).toContain('Hidden')
  })

  it('#575 renders operational AlertBanner with safe-URL & visibility notice', () => {
    const html = renderToStaticMarkup(<MegaMenuHeader />)
    expect(html).toContain('Safe-URL Enforcement &amp; Flyout Visibility')
    expect(html).toContain('re-validated server-side')
    expect(html).toContain('View Storefront')
  })

  it('#576 renders header actions including Site Settings, Theme, and Storefront links', () => {
    const html = renderToStaticMarkup(<MegaMenuHeader />)
    expect(html).toContain('Site Settings ↗')
    expect(html).toContain('Theme ↗')
    expect(html).toContain('Storefront ↗')
    // Storefront-facing link opens a new tab so unsaved global edits aren't lost.
    expect(html).toContain('target="_blank" rel="noopener noreferrer" href="/"')
  })

  it('#577 renders storefront chrome scope badge, scope chip, and subtitle', () => {
    const html = renderToStaticMarkup(<MegaMenuHeader />)
    expect(html).toContain('Storefront Chrome')
    expect(html).toContain('Settings &amp; Design · Navigation')
    expect(html).toContain('Nexus header flyout')
  })

  it('#581 megaMenuStatsFromDoc mirrors resolver: title-less sections dropped, promos need title+url', () => {
    // resolveMegaMenu drops sections without a title and promos missing either
    // title or url — the KPIs must reflect what actually renders (review F2).
    const stats = megaMenuStatsFromDoc({
      sections: [
        { title: 'Shop', items: [{}, {}], featuredPromo: { title: 'Sale', url: '/shop' } },
        { title: '', items: [{}] }, // dropped — no title
        { title: 'Build', featuredPromo: { title: 'No URL promo' } }, // promo dropped
      ],
    })
    expect(stats).toEqual({
      sectionsCount: 2,
      itemsCount: 2, // the dropped title-less section's item doesn't count
      promoCount: 1,
      menuStatus: 'Live',
    })
    expect(megaMenuStatsFromDoc({ sections: [] }).menuStatus).toBe('Hidden')
    expect(megaMenuStatsFromDoc({}).menuStatus).toBe('Hidden')
  })
})

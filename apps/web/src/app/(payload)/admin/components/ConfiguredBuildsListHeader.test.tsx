import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConfiguredBuildsListHeader } from './ConfiguredBuildsListHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/collections/configured-builds',
  useSearchParams: () => new URLSearchParams(),
}))

describe('ConfiguredBuildsListHeader (#545 - #549)', () => {
  it('#545 renders 4-card telemetry ribbon with default configured builds stats', () => {
    const html = renderToStaticMarkup(<ConfiguredBuildsListHeader />)
    expect(html).toContain('TOTAL RIG BUILDS')
    expect(html).toContain('12')
    expect(html).toContain('CHECKED OUT &amp; ORDERED')
    expect(html).toContain('5')
    expect(html).toContain('ACTIVE IN CARTS')
    expect(html).toContain('4')
    expect(html).toContain('AVG RIG VALUE')
    expect(html).toContain('1,899.00')
  })

  it('#546 renders custom configured build stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <ConfiguredBuildsListHeader
        stats={{
          totalCount: 28,
          inCartCount: 9,
          orderedCount: 14,
          avgPriceCents: 245000,
        }}
      />
    )
    expect(html).toContain('28')
    expect(html).toContain('9')
    expect(html).toContain('14')
    expect(html).toContain('2,450.00')
  })

  it('#547 renders operational AlertBanner with rig integrity & price snapshot notice', () => {
    const html = renderToStaticMarkup(<ConfiguredBuildsListHeader />)
    expect(html).toContain('Rig Integrity &amp; Price Snapshot Validation')
    expect(html).toContain('Build totals and component slot references are strictly re-verified')
    expect(html).toContain('Launch Configurator')
  })

  it('#548 renders FilterPills facet rail with build status filters', () => {
    const html = renderToStaticMarkup(<ConfiguredBuildsListHeader />)
    expect(html).toContain('All Builds')
    expect(html).toContain('Drafts')
    expect(html).toContain('In Cart')
    expect(html).toContain('Ordered')
    expect(html).toContain('Shared Tokens')
  })

  it('#549 renders header actions including Export CSV and Create Build CTA', () => {
    const html = renderToStaticMarkup(<ConfiguredBuildsListHeader />)
    expect(html).toContain('Export CSV')
    expect(html).toContain('Configurator ↗')
    expect(html).toContain('Create Configured Build')
    expect(html).toContain('Active Baskets')
  })
})

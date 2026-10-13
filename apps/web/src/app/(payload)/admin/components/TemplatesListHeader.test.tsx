import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TemplatesListHeader } from './TemplatesListHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/collections/build-templates',
  useSearchParams: () => new URLSearchParams(),
}))

describe('TemplatesListHeader (#540 - #544)', () => {
  it('#540 renders 4-card telemetry ribbon with default blueprint stats', () => {
    const html = renderToStaticMarkup(<TemplatesListHeader />)
    expect(html).toContain('TOTAL BLUEPRINTS')
    expect(html).toContain('3')
    expect(html).toContain('PUBLISHED RIGS')
    expect(html).toContain('AVG BASE PRICE')
    expect(html).toContain('2,499.00')
    expect(html).toContain('GAMING PRESETS')
    expect(html).toContain('2')
  })

  it('#541 renders custom template stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <TemplatesListHeader
        stats={{
          totalCount: 8,
          publishedCount: 6,
          avgPriceCents: 325000,
          gamingCount: 5,
        }}
      />
    )
    expect(html).toContain('8')
    expect(html).toContain('6')
    expect(html).toContain('3,250.00')
    expect(html).toContain('5')
  })

  it('#542 renders operational AlertBanner with automated price recalculation notice', () => {
    const html = renderToStaticMarkup(<TemplatesListHeader />)
    expect(html).toContain('Automated Blueprint Price Recalculation')
    expect(html).toContain('Template base prices are dynamically recomputed')
    expect(html).toContain('Launch Configurator')
  })

  it('#543 renders FilterPills facet rail with blueprint category filters', () => {
    const html = renderToStaticMarkup(<TemplatesListHeader />)
    expect(html).toContain('All Blueprints')
    expect(html).toContain('Published')
    expect(html).toContain('Drafts')
    expect(html).toContain('Gaming')
    expect(html).toContain('Workstation')
    expect(html).toContain('Creator / Editing')
  })

  it('#544 renders header actions including Export CSV and Create Blueprint CTA', () => {
    const html = renderToStaticMarkup(<TemplatesListHeader />)
    expect(html).toContain('Export CSV')
    expect(html).toContain('Configurator ↗')
    expect(html).toContain('Create Blueprint')
    expect(html).toContain('Rig Catalog')
  })
})

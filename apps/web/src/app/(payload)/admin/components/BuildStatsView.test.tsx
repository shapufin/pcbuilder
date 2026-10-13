import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuildStatsView } from './BuildStatsView.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/build-stats',
  useSearchParams: () => new URLSearchParams(),
}))

describe('BuildStatsView (#530 - #534)', () => {
  it('#530 renders a loading ribbon — never fabricated demo stats', () => {
    const html = renderToStaticMarkup(<BuildStatsView />)
    expect(html).toContain('GROSS REVENUE')
    expect(html).toContain('STOREFRONT ORDERS')
    expect(html).toContain('CONFIGURED RIGS')
    expect(html).toContain('POPULAR TEMPLATES')
    // Audit fix: no demo revenue/orders/templates on the initial render.
    expect(html).not.toContain('18,450.00')
    expect(html).not.toContain('Workstation Extreme Pro')
    expect(html).toContain('…')
  })

  it('#531 renders custom build stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <BuildStatsView
        stats={{
          revenueCents: 2500000,
          orderCount: 32,
          orderStatusCounts: { processing: 7, completed: 25 },
          builds: { total: 45, draft: 20, addedToCart: 15, ordered: 10 },
          topTemplates: [{ id: '1', name: 'Ultra Gamer Elite', popularity: 22 }],
          lowStock: [{ id: '1', name: 'Nvidia RTX 4090', inventory: 1 }],
        }}
      />
    )
    expect(html).toContain('25,000.00')
    expect(html).toContain('32')
    expect(html).toContain('45')
    expect(html).toContain('Ultra Gamer Elite')
    expect(html).toContain('Nvidia RTX 4090')
  })

  it('#532 renders operational inventory alert notice when low stock components exist', () => {
    const html = renderToStaticMarkup(
      <BuildStatsView
        stats={{
          revenueCents: 0,
          orderCount: 0,
          orderStatusCounts: {},
          builds: { total: 0, draft: 0, addedToCart: 0, ordered: 0 },
          topTemplates: [],
          lowStock: [
            { id: '1', name: 'RTX 4090', inventory: 1 },
            { id: '2', name: 'DDR5 64GB', inventory: 2 },
            { id: '3', name: 'Lian Li O11', inventory: 3 },
          ],
        }}
      />,
    )
    expect(html).toContain('INVENTORY RISK')
    expect(html).toContain('Critical Hardware Inventory Notice')
    expect(html).toContain('3 components have low inventory levels')
  })

  it('#533 renders conversion funnel stages and popular rig templates ranking', () => {
    const html = renderToStaticMarkup(<BuildStatsView />)
    expect(html).toContain('Rig Studio Conversion Funnel')
    expect(html).toContain('Configurations Started')
    expect(html).toContain('Saved Drafts')
    expect(html).toContain('Moved to Cart')
    expect(html).toContain('Purchased / Ordered')
    expect(html).toContain('Popular Rig Templates')
  })

  it('#534 renders export funnel action button and refresh telemetry trigger', () => {
    const html = renderToStaticMarkup(<BuildStatsView />)
    expect(html).toContain('Export Funnel')
    expect(html).toContain('Refresh') // 'Refreshing…' while loading, 'Refresh Telemetry' idle
    expect(html).toContain('RIG Studio Build Analytics')
  })
})

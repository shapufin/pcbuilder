import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OrdersListHeader } from './OrdersListHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/collections/orders',
  useSearchParams: () => new URLSearchParams(),
}))

describe('OrdersListHeader (#525 - #529)', () => {
  it('#525 renders a loading ribbon — never fabricated demo stats', () => {
    const html = renderToStaticMarkup(<OrdersListHeader />)
    expect(html).toContain('TOTAL ORDERS')
    expect(html).toContain('PENDING FULFILLMENT')
    expect(html).toContain('COMPLETED / SHIPPED')
    expect(html).toContain('GROSS REVENUE')
    // Audit fix: the initial render must not ship demo numbers — metrics
    // show the loading placeholder until the API responds.
    expect(html).not.toContain('bmr-metric-card__value">24<')
    expect(html).not.toContain('bmr-metric-card__value">17<')
    expect(html).not.toContain('18,450.00')
    expect(html).toContain('bmr-metric-card__value">…<')
  })

  it('#526 renders custom fulfillment stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <OrdersListHeader
        stats={{
          totalCount: 50,
          pendingCount: 8,
          completedCount: 40,
          revenueTotal: 34200.5,
        }}
      />
    )
    expect(html).toContain('50')
    expect(html).toContain('8')
    expect(html).toContain('40')
    expect(html).toContain('34,200.50')
  })

  it('#527 renders operational backlog alert banner when pending orders exist', () => {
    const html = renderToStaticMarkup(
      <OrdersListHeader
        stats={{
          totalCount: 9,
          pendingCount: 5,
          completedCount: 4,
          revenueTotal: 0,
        }}
      />,
    )
    expect(html).toContain('FULFILLMENT')
    expect(html).toContain('Order Fulfillment Backlog')
    expect(html).toContain('5 orders are pending processing and warehouse dispatch')
  })

  it('#527b renders no backlog banner and a real zero when the store has no orders', () => {
    const html = renderToStaticMarkup(
      <OrdersListHeader
        stats={{
          totalCount: 0,
          pendingCount: 0,
          completedCount: 0,
          revenueTotal: 0,
        }}
      />,
    )
    expect(html).not.toContain('Order Fulfillment Backlog')
    // A real zero renders as a zero, not a substituted default.
    expect(html).toContain('>0<')
    expect(html).toContain('€0.00')
  })

  it('#528 renders facet filter pills for order statuses', () => {
    const html = renderToStaticMarkup(<OrdersListHeader />)
    expect(html).toContain('All Orders')
    expect(html).toContain('Processing')
    expect(html).toContain('Completed')
    expect(html).toContain('Cancelled')
  })

  it('#529 renders quick actions including Export Orders CSV button', () => {
    const html = renderToStaticMarkup(<OrdersListHeader />)
    expect(html).toContain('Export Orders')
    expect(html).toContain('Orders &amp; Fulfillment')
  })
})

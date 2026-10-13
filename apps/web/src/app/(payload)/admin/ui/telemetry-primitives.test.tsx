import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MetricCard } from './MetricCard'
import { AlertBanner } from './AlertBanner'
import { FilterPills } from './FilterPills'
import { ShoppingCart, AlertTriangle } from 'lucide-react'

describe('Admin UI Telemetry & Ergonomic Primitives (Phase 2)', () => {
  it('#495 MetricCard renders value, label, trend delta, and icon badge with bmr-* classes', () => {
    const html = renderToString(
      <MetricCard
        label="Gross Revenue"
        value="€18,450.00"
        subtext="38 orders recorded"
        trend={{ direction: 'up', label: '+12.4% vs last month' }}
        icon={ShoppingCart}
        href="/admin/collections/orders"
      />
    )
    expect(html).toContain('bmr-metric-card')
    expect(html).toContain('Gross Revenue')
    expect(html).toContain('€18,450.00')
    expect(html).toContain('38 orders recorded')
    expect(html).toContain('+12.4% vs last month')
    expect(html).toContain('bmr-metric-card__trend--up')
    expect(html).toContain('bmr-metric-card__icon-box')
  })

  it('#496 MetricCard renders without trend or link gracefully', () => {
    const html = renderToString(
      <MetricCard
        label="Rule Engine Health"
        value="100% Valid"
        subtext="0 conflicts detected"
      />
    )
    expect(html).toContain('bmr-metric-card')
    expect(html).toContain('Rule Engine Health')
    expect(html).toContain('100% Valid')
    expect(html).not.toContain('bmr-metric-card__trend')
  })

  it('#497 AlertBanner renders severity badge, title, description, counter, and action link', () => {
    const html = renderToString(
      <AlertBanner
        severity="warning"
        badge="BACKLOG"
        title="Aged Cart Reservations Alert"
        description="4 cart reservations have exceeded the 15-minute checkout window."
        counter="1 / 3"
        action={{ label: 'Inspect Reservations', href: '/admin/collections/inventory-reservations' }}
        icon={AlertTriangle}
      />
    )
    expect(html).toContain('bmr-alert-banner')
    expect(html).toContain('bmr-alert-banner--warning')
    expect(html).toContain('BACKLOG')
    expect(html).toContain('Aged Cart Reservations Alert')
    expect(html).toContain('4 cart reservations have exceeded')
    expect(html).toContain('1 / 3')
    expect(html).toContain('Inspect Reservations')
  })

  it('#498 AlertBanner renders minimal critical variant without counter', () => {
    const html = renderToString(
      <AlertBanner
        severity="critical"
        title="PSU Headroom Warning"
        description="Chassis clearance exceeds 320mm constraint on 2 draft configurations."
      />
    )
    expect(html).toContain('bmr-alert-banner')
    expect(html).toContain('bmr-alert-banner--critical')
    expect(html).toContain('PSU Headroom Warning')
  })

  it('#499 FilterPills renders items, highlights active pill, and displays counter tags', () => {
    const items = [
      { id: 'all', label: 'All Sections', count: 42 },
      { id: 'store', label: 'Store & Orders', count: 18 },
      { id: 'builder', label: 'Builder Engine', count: 14 },
    ]
    const html = renderToString(
      <FilterPills
        items={items}
        activeId="store"
        onChange={() => {}}
      />
    )
    expect(html).toContain('bmr-filter-pills')
    expect(html).toContain('All Sections')
    expect(html).toContain('Store &amp; Orders')
    expect(html).toContain('bmr-filter-pill--active')
    expect(html).toContain('bmr-filter-pill__count')
  })

  it('#500 FilterPills renders empty count gracefully and supports variant sizes', () => {
    const items = [
      { id: 'published', label: 'Published' },
      { id: 'draft', label: 'Draft' },
    ]
    const html = renderToString(
      <FilterPills
        items={items}
        activeId="draft"
        onChange={() => {}}
        size="sm"
      />
    )
    expect(html).toContain('bmr-filter-pills')
    expect(html).toContain('bmr-filter-pills--sm')
    expect(html).toContain('Published')
    expect(html).toContain('Draft')
  })
})

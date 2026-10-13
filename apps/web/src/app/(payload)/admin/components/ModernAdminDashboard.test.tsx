import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModernAdminDashboard } from './ModernAdminDashboard'

describe('Admin GUI — ModernAdminDashboard Primitive Migration', () => {
  it('#492 ModernAdminDashboard renders Button, Badge, and Card primitives', () => {
    const html = renderToStaticMarkup(<ModernAdminDashboard />)

    // Button primitives for header actions
    expect(html).toContain('bmr-btn')
    expect(html).toContain('bmr-btn--primary')
    expect(html).toContain('bmr-btn--secondary')

    // Badge primitives for operational beacon & domain tags
    expect(html).toContain('bmr-badge')

    // Card primitives for domain workspace hubs
    expect(html).toContain('bmr-card')
  })

  it('#493 ModernAdminDashboard contains zero inline style color attributes', () => {
    const html = renderToStaticMarkup(<ModernAdminDashboard />)

    // Verify zero inline style color declarations
    expect(html).not.toMatch(/style="[^"]*color\s*:/)
  })

  it('#494 ModernAdminDashboard renders domain hub links with CardHeader, CardTitle, and CardContent', () => {
    const html = renderToStaticMarkup(<ModernAdminDashboard />)

    expect(html).toContain('bmr-card__header')
    expect(html).toContain('bmr-card__title')
    expect(html).toContain('bmr-card__content')
    expect(html).toContain('Store &amp; Commerce')
    expect(html).toContain('PC Builder Engine')
    expect(html).toContain('Content &amp; Layout')
    expect(html).toContain('Design &amp; System')
  })

  it('#501 ModernAdminDashboard renders MetricCard ribbon, AlertBanner, FilterPills, and Progress telemetry', () => {
    const html = renderToStaticMarkup(<ModernAdminDashboard />)

    expect(html).toContain('bmr-metric-card')
    expect(html).toContain('bmr-alert-banner')
    expect(html).toContain('bmr-filter-pills')
    expect(html).toContain('bmr-dash-telemetry-panel')
    expect(html).toContain('LIVE MATRIX')
    expect(html).toContain('Compatibility Engine Synchronized')
  })
})


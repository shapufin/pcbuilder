import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PluginsManagerView } from './PluginsManagerView'

vi.mock('next/link', async () => {
  const { jsx } = await import('react/jsx-runtime')
  return {
    default: ({
      href,
      children,
      ...rest
    }: {
      href: string
      children?: React.ReactNode
      [key: string]: unknown
    }) => jsx('a', { href, ...rest, children }),
  }
})

describe('PluginsManagerView Primitive Refactor (Phase 2)', () => {
  it('#465 renders header, title, and primitive buttons with navigation links', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)
    expect(html).toContain('Plugins &amp; Extensions Manager')
    expect(html).toContain('MODULAR EXTENSIONS RUNTIME')
    expect(html).toContain('href="/admin/globals/store-settings"')
    expect(html).toContain('href="/admin/compatibility-rules-manager"')
    expect(html).toContain('bmr-btn')
    expect(html).toContain('bmr-badge')
  })

  it('#466 renders plugin cards with bmr-card and bmr-plugin-card classes instead of inline card borders', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)
    expect(html).toContain('bmr-card')
    expect(html).toContain('bmr-plugin-card')
    expect(html).toContain('E-Commerce &amp; Storefront Core')
    expect(html).toContain('RIG Studio PC Builder Engine')
    expect(html).toContain('Page Builder &amp; Modular Block Suite v2')
  })

  it('#467 renders functional status pills using Badge primitive', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)
    expect(html).toContain('bmr-badge--success')
    expect(html).toContain('bmr-badge__dot')
    expect(html).toContain('Active')
  })

  it('#468 renders toolbar search using Input primitive with prefix icon slot', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)
    expect(html).toContain('bmr-input')
    expect(html).toContain('bmr-input__prefix')
    expect(html).toContain('placeholder="Search installed plugins..."')
  })

  it('#469 renders feature tags with BEM classes', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)
    expect(html).toContain('bmr-plugin-card__feature-chip')
    expect(html).toContain('Stripe 3DS Settlement')
    expect(html).toContain('Socket Auto-Matching')
  })

  it('#470 renders footer controls with primitive Buttons', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)
    expect(html).toContain('bmr-plugin-card__footer')
    expect(html).toContain('Configure')
    expect(html).toContain('Must-Use')
  })

  it('#502 renders MetricCard telemetry ribbon and FilterPills facet rail', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)
    expect(html).toContain('bmr-metric-card')
    expect(html).toContain('Installed Modules')
    // Honest derived metrics — no fabricated latency/uptime claims.
    expect(html).toContain('Active Engines')
    expect(html).not.toContain('Execution Latency')
    expect(html).not.toContain('Operational')
    expect(html).toContain('bmr-filter-pills')
    expect(html).toContain('bmr-filter-pill--active')
  })
})


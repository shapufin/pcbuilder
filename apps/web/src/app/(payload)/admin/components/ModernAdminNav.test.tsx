import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { ModernAdminNav } from './ModernAdminNav'
import { ModernAdminDashboard } from './ModernAdminDashboard'
import { AdminHeaderActions } from './AdminHeaderActions'
import { PluginsManagerView } from './PluginsManagerView'

describe('Modern Admin GUI Overhaul — Components & Contract', () => {
  it('#458 ModernAdminNav renders 5 domain sections and essential navigation items', () => {
    const html = renderToStaticMarkup(<ModernAdminNav />)

    // A11y & Navigation shell
    expect(html).toContain('aria-label="Admin Navigation"')
    expect(html).toContain('bmr-modern-nav')
    expect(html).toContain('BuildMyRig')

    // 5 Clean Domain Workspaces
    expect(html).toContain('Store &amp; Commerce')
    expect(html).toContain('PC Builder Engine')
    expect(html).toContain('Content &amp; Media')
    expect(html).toContain('Settings &amp; Design')
    expect(html).toContain('Access &amp; System')

    // Key Collection Links
    expect(html).toContain('href="/admin/collections/orders"')
    expect(html).toContain('href="/admin/collections/products"')
    expect(html).toContain('href="/admin/collections/components"')
    expect(html).toContain('href="/admin/collections/configured-builds"')
    expect(html).toContain('href="/admin/compatibility-rules-manager"')
    expect(html).toContain('href="/admin/build-stats"')
    expect(html).toContain('href="/admin/collections/pages"')
    expect(html).toContain('href="/admin/globals/theme"')
    expect(html).toContain('href="/admin/collections/users"')
    expect(html).toContain('href="/admin/plugins"')
    expect(html).toContain('Plugins &amp; Extensions')

    // Quick Search & Footer Links
    expect(html).toContain('Quick search...')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/admin/logout"')

    // Streamlined Navigation: Product Attributes present, raw Prices and Attribute Values removed
    expect(html).toContain('Product Attributes')
    expect(html).toContain('href="/admin/collections/attribute-types"')
    expect(html).not.toContain('href="/admin/collections/prices"')
    expect(html).not.toContain('href="/admin/collections/attribute-values"')
  })

  it('#459 ModernAdminDashboard renders operational telemetry, KPI grid and domain hub', () => {
    const html = renderToStaticMarkup(<ModernAdminDashboard />)

    // Operations Header
    expect(html).toContain('RIG Studio Command Center')
    expect(html).toContain('OPERATIONAL')

    // KPI Metric Cards
    expect(html).toContain('Gross Revenue')
    expect(html).toContain('Custom Builds')
    expect(html).toContain('Compatibility Rules')
    expect(html).toContain('Build Telemetry')

    // Quick Action Bar
    expect(html).toContain('Quick Actions')
    expect(html).toContain('Add Product')
    expect(html).toContain('Add Component')

    // Structured Domain Workspace Hub
    expect(html).toContain('bmr-workspace-card')
    expect(html).toContain('Hardware Components')
    expect(html).toContain('Product Catalog')
    expect(html).toContain('CMS Landing Pages')
  })

  it('#460 AdminHeaderActions renders theme options and storefront launch button', () => {
    const html = renderToStaticMarkup(<AdminHeaderActions />)

    expect(html).toContain('aria-label="Admin GUI Theme"')
    expect(html).toContain('value="precision-dark"')
    expect(html).toContain('value="light-clean"')
    expect(html).toContain('value="cyber-neon"')
    expect(html).toContain('value="classic-payload"')
    expect(html).toContain('Storefront')
  })

  it('#461 PluginsManagerView renders installed plugins, system status and filter tabs', () => {
    const html = renderToStaticMarkup(<PluginsManagerView />)

    expect(html).toContain('Plugins &amp; Extensions Manager')
    expect(html).toContain('@buildmyrig/plugin-shop')
    expect(html).toContain('@buildmyrig/plugin-pc-builder')
    expect(html).toContain('@buildmyrig/plugin-pages')
    expect(html).toContain('Search installed plugins...')
    expect(html).toContain('Core / Must-Use')

    // 4 Modular Commerce Plugins & When to disable guidance
    expect(html).toContain('Discount Codes &amp; Promotions Plugin')
    expect(html).toContain('Customer Reviews &amp; Ratings Plugin')
    expect(html).toContain('Inventory Reservations &amp; Cart Holds Plugin')
    expect(html).toContain('Dynamic Tax Rates &amp; Regional VAT Engine')
    expect(html).toContain('When to disable:')
  })

  it('#478 ModernAdminNav renders nav-footer theme picker and user profile card (Phase 4 Shell)', () => {
    const html = renderToStaticMarkup(<ModernAdminNav />)

    // Nav footer theme picker
    expect(html).toContain('bmr-nav-theme-picker')
    expect(html).toContain('bmr-nav-theme-buttons')
    expect(html).toContain('Dark')
    expect(html).toContain('Light')
    expect(html).toContain('Cyber')
    expect(html).toContain('Classic')

    // Nav footer user card
    expect(html).toContain('bmr-nav-user-card')
    expect(html).toContain('bmr-nav-user-avatar')
    expect(html).toContain('Administrator')
    expect(html).toContain('admin@buildmyrig.test')
    expect(html).toContain('href="/admin/logout"')
  })

  it('#484 ModernAdminNav renders ⌘K command palette trigger in search box (Phase 5 Shell)', () => {
    const html = renderToStaticMarkup(<ModernAdminNav />)
    expect(html).toContain('bmr-nav__search-kbd-btn')
    expect(html).toContain('⌘K')
  })

  it('#633 ModernAdminNav exposes the Design System spec view under Settings & Design', () => {
    const html = renderToStaticMarkup(<ModernAdminNav />)
    expect(html).toContain('href="/admin/design-system"')
    expect(html).toContain('Design System')
  })

  it('#509 ModernAdminNav renders desktop rail toggle button with bmr-nav__toggle-btn class', () => {
    const html = renderToStaticMarkup(<ModernAdminNav />)
    expect(html).toContain('bmr-nav__toggle-btn')
    expect(html).toContain('Collapse to Rail')
  })

  it('#643 ModernAdminNav surfaces previously hidden collections (variants, carts, transactions, derived power rules)', () => {
    const html = renderToStaticMarkup(<ModernAdminNav />)
    expect(html).toContain('href="/admin/collections/variants"')
    expect(html).toContain('href="/admin/collections/carts"')
    expect(html).toContain('href="/admin/collections/discount-codes"')
    expect(html).toContain('href="/admin/collections/transactions"')
    expect(html).toContain('href="/admin/collections/inventory-reservations"')
    expect(html).toContain('href="/admin/collections/derived-power-rules"')
    expect(html).toContain('href="/admin/collections/reviews"')
    expect(html).toContain('href="/admin/collections/tax-rates"')
  })
})


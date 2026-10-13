import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CommandPalette } from './CommandPalette'

describe('Admin GUI — CommandPalette Primitive (Phase 5)', () => {
  it('#479 CommandPalette renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(<CommandPalette isOpen={false} onClose={() => {}} />)
    expect(html).toBe('')
  })

  it('#480 CommandPalette renders dialog, search input, action items, and keyboard hints when open', () => {
    const html = renderToStaticMarkup(<CommandPalette isOpen={true} onClose={() => {}} />)

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('bmr-command-palette-backdrop')
    expect(html).toContain('bmr-command-palette-dialog')
    expect(html).toContain('bmr-command-palette__input')
    expect(html).toContain('placeholder="Type a command or jump to screen... (ESC to exit)"')
    expect(html).toContain('bmr-command-palette__footer')
    expect(html).toContain('ESC')
  })

  it('#481 CommandPalette displays navigation targets and quick actions', () => {
    const html = renderToStaticMarkup(<CommandPalette isOpen={true} onClose={() => {}} />)

    // Key collections & admin pages
    expect(html).toContain('Products')
    expect(html).toContain('Orders')
    expect(html).toContain('Components')
    expect(html).toContain('Configured Builds')
    expect(html).toContain('Rule Matrix Manager')
    expect(html).toContain('Plugins &amp; Extensions')

    // Quick actions & theme toggles
    expect(html).toContain('Launch Storefront')
    expect(html).toContain('Theme: Modern Slate (Dark)')
    expect(html).toContain('Theme: Enterprise SaaS (Light)')
  })

  it('#482 CommandPalette filters actions when initialQuery matches specific term', () => {
    const html = renderToStaticMarkup(
      <CommandPalette isOpen={true} onClose={() => {}} initialQuery="plugins" />
    )

    expect(html).toContain('Plugins &amp; Extensions')
    expect(html).not.toContain('Shipping Bands')
  })

  it('#483 CommandPalette renders empty state message when query yields no matches', () => {
    const html = renderToStaticMarkup(
      <CommandPalette isOpen={true} onClose={() => {}} initialQuery="nonexistentxyzquery" />
    )

    expect(html).toContain('bmr-command-palette__empty')
    expect(html).toContain('No matching commands or destinations found.')
  })

  it('#644 CommandPalette surfaces hidden-collection destinations in full nav parity with the sidebar', () => {
    const html = renderToStaticMarkup(<CommandPalette isOpen={true} onClose={() => {}} />)
    for (const label of [
      'Variants',
      'Carts',
      'Discount Codes',
      'Transactions',
      'Inventory Reservations',
      'Derived Power Rules',
      'Reviews',
      'Tax Rates',
    ]) {
      expect(html).toContain(label)
    }
  })
})

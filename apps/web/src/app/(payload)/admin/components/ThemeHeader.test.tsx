import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeHeader, countThemeOverrides } from './ThemeHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/globals/theme',
  useSearchParams: () => new URLSearchParams(),
}))

describe('ThemeHeader (#568 - #572)', () => {
  it('#568 renders 4-card telemetry ribbon with default theme engine stats', () => {
    const html = renderToStaticMarkup(<ThemeHeader />)
    expect(html).toContain('ACTIVE PRESET')
    expect(html).toContain('RIG Dark')
    expect(html).toContain('PRESET OPTIONS')
    expect(html).toContain('TOKEN OVERRIDES')
    expect(html).toContain('CHROME PACK')
  })

  it('#569 renders custom theme stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <ThemeHeader
        stats={{
          presetLabel: 'Nexus',
          presetOptions: 7,
          tokenOverrides: 12,
          packLabel: 'Nexus pack',
        }}
      />
    )
    expect(html).toContain('Nexus')
    expect(html).toContain('7')
    expect(html).toContain('12')
    expect(html).toContain('Nexus pack')
  })

  it('#570 renders operational AlertBanner with preset-swap & token fallback notice', () => {
    const html = renderToStaticMarkup(<ThemeHeader />)
    expect(html).toContain('Preset Swap &amp; Token Fallback')
    expect(html).toContain('fall back to the preset')
    expect(html).toContain('View Storefront')
  })

  it('#571 renders header actions including Site Settings, Mega Menu, and Storefront links', () => {
    const html = renderToStaticMarkup(<ThemeHeader />)
    expect(html).toContain('Site Settings ↗')
    expect(html).toContain('Mega Menu ↗')
    expect(html).toContain('Storefront ↗')
    // Storefront-facing link opens a new tab so unsaved global edits aren't lost.
    expect(html).toContain('target="_blank" rel="noopener noreferrer" href="/"')
  })

  it('#572 renders theme engine scope badge, scope chip, and subtitle', () => {
    const html = renderToStaticMarkup(<ThemeHeader />)
    expect(html).toContain('Theme Engine')
    expect(html).toContain('Settings &amp; Design · Visual Tokens')
    expect(html).toContain('Storefront preset')
  })

  it('#580 countThemeOverrides ignores group id fields and empty strings', () => {
    // Payload REST serializes each group with an `id` string — it must not be
    // counted as an override (review F1).
    expect(
      countThemeOverrides({
        colors: { id: 'c1', bg: '#000', text: '', primary: ' #fff ' },
        radius: { id: 'r1', sm: '8px' },
        fonts: { id: 'f1' },
      }),
    ).toBe(3)
    expect(countThemeOverrides({})).toBe(0)
  })
})

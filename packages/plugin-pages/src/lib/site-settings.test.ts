import { describe, expect, it } from 'vitest'
import { DEFAULT_SITE_SETTINGS, resolveSiteSettings } from './site-settings'

/**
 * Step A (entry 18) - admin-editable header/footer links resolve through one
 * pure function: missing doc -> defaults, present doc -> admin arrays with
 * unsafe/incomplete entries dropped (internal `/...` or `https://...` only -
 * blocks `javascript:` and `//host` protocol-relative URLs even though only
 * managers can write the global).
 */
describe('site settings - link resolution', () => {
  it('#101 no doc -> defaults; custom doc replaces both arrays', () => {
    expect(resolveSiteSettings(null)).toEqual(DEFAULT_SITE_SETTINGS)
    expect(resolveSiteSettings(undefined)).toEqual(DEFAULT_SITE_SETTINGS)

    const resolved = resolveSiteSettings({
      navLinks: [{ label: 'Deals', url: '/shop?sale=1' }],
      footerLinks: [{ label: 'Support', url: 'https://help.example.com' }],
    })
    expect(resolved.navLinks).toEqual([{ label: 'Deals', url: '/shop?sale=1' }])
    expect(resolved.footerLinks).toEqual([{ label: 'Support', url: 'https://help.example.com' }])
  })

  it('#102 unsafe or incomplete entries are dropped, valid ones kept', () => {
    const resolved = resolveSiteSettings({
      navLinks: [
        { label: 'OK', url: '/blog' },
        { label: 'XSS', url: 'javascript:alert(1)' },
        { label: 'Protocol relative', url: '//evil.example.com' },
        { label: 'Backslash scheme', url: '/\\evil.example.com' },
        { label: 'Absolute http', url: 'http://plain.example.com' },
        { label: '', url: '/no-label' },
        { label: 'No url', url: '' },
      ],
      footerLinks: [],
    })
    expect(resolved.navLinks).toEqual([{ label: 'OK', url: '/blog' }])
    expect(resolved.footerLinks).toEqual([])
  })

  it('#103 empty array is a deliberate choice (nav hidden), missing array falls back to defaults', () => {
    const hidden = resolveSiteSettings({ navLinks: [] })
    expect(hidden.navLinks).toEqual([])
    expect(hidden.footerLinks).toEqual(DEFAULT_SITE_SETTINGS.footerLinks)

    const partial = resolveSiteSettings({ footerLinks: [{ label: 'X', url: '/x' }] })
    expect(partial.navLinks).toEqual(DEFAULT_SITE_SETTINGS.navLinks)
    expect(partial.footerLinks).toEqual([{ label: 'X', url: '/x' }])
  })

  it('#104 labels/urls trimmed, overlong values truncated', () => {
    const resolved = resolveSiteSettings({
      navLinks: [{ label: '   Padded   ', url: '  /pad  ' }],
      footerLinks: [{ label: 'L'.repeat(120), url: `/u${'x'.repeat(4000)}` }],
    })
    expect(resolved.navLinks).toEqual([{ label: 'Padded', url: '/pad' }])
    expect(resolved.footerLinks[0]!.label).toHaveLength(60)
    expect(resolved.footerLinks[0]!.url).toHaveLength(2048)
  })

  it('#438 announcements: missing -> defaults; empty -> hidden; rows cleaned', () => {
    expect(resolveSiteSettings(null).announcements).toEqual(DEFAULT_SITE_SETTINGS.announcements)
    expect(resolveSiteSettings({ announcements: [] }).announcements).toEqual([])
    const resolved = resolveSiteSettings({
      announcements: [{ text: '  First  ' }, { text: '' }, { notText: true }, { text: 'x'.repeat(300) }],
    })
    expect(resolved.announcements).toEqual(['First', 'x'.repeat(160)])
  })

  it('#450 adminTheme: valid option preserved; invalid or missing falls back to default', () => {
    expect(resolveSiteSettings(null).adminTheme).toBe('precision-dark')
    expect(resolveSiteSettings({ adminTheme: 'cyber-neon' }).adminTheme).toBe('cyber-neon')
    expect(resolveSiteSettings({ adminTheme: 'light-clean' }).adminTheme).toBe('light-clean')
    expect(resolveSiteSettings({ adminTheme: 'invalid-theme' }).adminTheme).toBe('precision-dark')
  })
})

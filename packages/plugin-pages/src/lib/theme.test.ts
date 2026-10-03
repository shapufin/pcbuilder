import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  LIGHT_COLORS,
  THEME_PRESETS,
  buildThemeCss,
  resolveTheme,
  themePresetOptions,
  validateColor,
  validateFont,
  validateRadius,
} from './theme'
import { Theme } from '../globals/Theme'

/**
 * Phase 5 Step C (entry 21) - theme global resolver. Contract mirrors
 * resolveSiteSettings: pure, accepts unknown, never throws. Extra hardening:
 * every admin-supplied value is re-validated in the resolver (defense in
 * depth) because values are injected into an inline <style> block - a value
 * like `red;}body{display:none` must fall back to the preset, not ship.
 */
describe('theme resolver - defaults and presets', () => {
  it('#133 no doc -> default (rig-dark) preset values; valid overrides merge over preset', () => {
    expect(resolveTheme(null)).toEqual(DEFAULT_THEME)
    expect(resolveTheme(undefined)).toEqual(DEFAULT_THEME)

    const resolved = resolveTheme({
      preset: 'rig-dark',
      colors: { bg: '#112233', textMuted: '#abcdef' },
      radius: { md: '6px' },
      fonts: { body: 'Georgia, serif' },
    })
    expect(resolved.colors.bg).toBe('#112233')
    expect(resolved.colors.textMuted).toBe('#abcdef')
    expect(resolved.colors.surface).toBe(DEFAULT_THEME.colors.surface)
    expect(resolved.radius.md).toBe('6px')
    expect(resolved.radius.sm).toBe(DEFAULT_THEME.radius.sm)
    expect(resolved.fonts.body).toBe('Georgia, serif')
    expect(resolved.fonts.mono).toBe(DEFAULT_THEME.fonts.mono)
  })

  it('#135 light preset applies; unknown preset falls back to default', () => {
    expect(resolveTheme({ preset: 'light' }).colors.bg).toBe(LIGHT_COLORS.bg)
    expect(resolveTheme({ preset: 'light' }).colors.text).toBe(LIGHT_COLORS.text)
    expect(resolveTheme({ preset: 'neon' })).toEqual(DEFAULT_THEME)
    expect(resolveTheme({}).colors.bg).toBe(DEFAULT_THEME.colors.bg)
  })

  it('#134 hostile values (CSS injection, junk) fall back to preset defaults', () => {
    const resolved = resolveTheme({
      colors: {
        bg: 'red;}body{display:none',
        text: 'url(javascript:alert(1))',
        primary: '#GGGGGG',
        surfaceRaised: '',
        border: 'currentColor',
      },
      radius: { sm: 'expression(alert(1))', lg: 'huge' },
      fonts: { heading: 'x; } * { display:none', mono: 'a'.repeat(500) },
    })
    expect(resolved.colors.bg).toBe(DEFAULT_THEME.colors.bg)
    expect(resolved.colors.text).toBe(DEFAULT_THEME.colors.text)
    expect(resolved.colors.primary).toBe(DEFAULT_THEME.colors.primary)
    expect(resolved.colors.surfaceRaised).toBe(DEFAULT_THEME.colors.surfaceRaised)
    expect(resolved.colors.border).toBe(DEFAULT_THEME.colors.border)
    expect(resolved.radius.sm).toBe(DEFAULT_THEME.radius.sm)
    expect(resolved.radius.lg).toBe(DEFAULT_THEME.radius.lg)
    expect(resolved.fonts.heading).toBe(DEFAULT_THEME.fonts.heading)
    expect(resolved.fonts.mono).toBe(DEFAULT_THEME.fonts.mono)
    expect(JSON.stringify(resolved)).not.toContain('display:none')
  })
})

describe('theme CSS emission', () => {
  it('#138 buildThemeCss renders one :root block with every var', () => {
    const css = buildThemeCss(DEFAULT_THEME)
    expect(css.startsWith(':root{')).toBe(true)
    expect(css.endsWith('}')).toBe(true)
    expect(css).toContain('--color-bg: #0f131c;')
    expect(css).toContain('--color-surface-raised: #1c2028;')
    expect(css).toContain('--color-text-muted: #8b90a0;')
    expect(css).toContain('--radius-sm: 4px;')
    expect(css).toContain('--font-body: var(--font-inter),')
    expect(css).not.toMatch(/undefined|null|NaN/)
    expect((css.match(/--color-bg:/g) ?? []).length).toBe(1)
  })
})

describe('theme field validators (admin form gate)', () => {
  it('#141 colors accept hex, reject injection; radius/font charsets enforced', () => {
    expect(validateColor('#abc')).toBe(true)
    expect(validateColor('#AABBCC')).toBe(true)
    expect(validateColor('#11223344')).toBe(false)
    expect(validateColor('red;}body{display:none')).toBe(false)
    expect(validateColor('rgb(0,0,0)')).toBe(false)
    expect(validateColor('')).toBe(false)
    expect(validateColor(42)).toBe(false)

    expect(validateRadius('4px')).toBe(true)
    expect(validateRadius('0.5rem')).toBe(true)
    expect(validateRadius('expression(alert(1))')).toBe(false)
    expect(validateRadius('4')).toBe(false)

    expect(validateFont('system-ui, sans-serif')).toBe(true)
    expect(validateFont("'Segoe UI', Roboto")).toBe(true)
    expect(validateFont('x; } * { display:none')).toBe(false)
    expect(validateFont('a'.repeat(500))).toBe(false)
  })

  it('#141b field-level validate accepts empty (preset fallback per admin hint), rejects junk', () => {
    type VField = { name: string; validate?: (v: unknown) => unknown }
    const groupFields = (group: string): VField[] => {
      const g = Theme.fields?.find((f) => 'name' in f && f.name === group) as { fields?: VField[] } | undefined
      return g?.fields ?? []
    }

    const bg = groupFields('colors').find((f) => f.name === 'bg')
    expect(bg).toBeDefined()
    expect(bg?.validate?.('')).toBe(true)
    expect(bg?.validate?.('   ')).toBe(true)
    expect(bg?.validate?.(undefined)).toBe(true)
    expect(bg?.validate?.('#112233')).toBe(true)
    expect(typeof bg?.validate?.('red;}body{display:none')).toBe('string')

    const md = groupFields('radius').find((f) => f.name === 'md')
    expect(md?.validate?.('')).toBe(true)
    expect(md?.validate?.('6px')).toBe(true)
    expect(typeof md?.validate?.('expression(alert(1))')).toBe('string')

    const body = groupFields('fonts').find((f) => f.name === 'body')
    expect(body?.validate?.(undefined)).toBe(true)
    expect(typeof body?.validate?.('x; } * { display:none')).toBe('string')
  })
})

describe('theme presets — design swap registry', () => {
  it('#288 registry drives the Theme global select; presets ship in code', () => {
    const keys = Object.keys(THEME_PRESETS)
    expect(keys).toEqual(['dark', 'light', 'midnight', 'rig-dark'])
    expect(themePresetOptions().map((o) => o.value)).toEqual(keys)
    const presetField = Theme.fields?.find((f) => 'name' in f && f.name === 'preset') as
      | { options?: Array<{ value: string }> }
      | undefined
    expect(presetField?.options?.map((o) => o.value)).toEqual(keys)
    // Every preset must emit the same additive var set — a missing key means
    // a silently unstyled var(--color-*) somewhere in app CSS.
    const extraKeys = Object.keys(THEME_PRESETS.dark.extras).sort()
    for (const def of Object.values(THEME_PRESETS)) {
      expect(Object.keys(def.extras).sort()).toEqual(extraKeys)
    }
  })

  it('#293 hostile preset keys (prototype-chain names) fall back to default, never throw', () => {
    for (const hostile of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      expect(() => resolveTheme({ preset: hostile })).not.toThrow()
      expect(resolveTheme({ preset: hostile })).toEqual(DEFAULT_THEME)
    }
  })

  it('#289 extras are preset-aware and emitted as --color-* vars', () => {
    const mid = resolveTheme({ preset: 'midnight' })
    expect(mid.preset).toBe('midnight')
    expect(mid.extras.scrim).toBe(THEME_PRESETS.midnight.extras.scrim)
    expect(mid.extras.scrim).not.toBe(THEME_PRESETS.dark.extras.scrim)
    const css = buildThemeCss(mid)
    expect(css).toContain(`--color-scrim: ${THEME_PRESETS.midnight.extras.scrim};`)
    expect(css).toContain(`--color-primary-glow: ${THEME_PRESETS.midnight.extras['primary-glow']};`)
  })

  it('#318 rig-dark is the default preset and emits the RIG palette as CSS', () => {
    const resolved = resolveTheme({ preset: 'rig-dark' })
    expect(resolved.preset).toBe('rig-dark')
    expect(resolved.colors.bg).toBe('#0f131c')
    expect(resolved.extras.accent).toBe('#7df4ff')
    expect(DEFAULT_THEME.preset).toBe('rig-dark')
    const css = buildThemeCss(resolved)
    expect(css).toContain('--color-bg: #0f131c;')
    // Source literal uses spaced rgba(); compare whitespace-normalized.
    expect(css.replace(/\s/g, '')).toContain('--color-primary-glow:rgba(125,244,255,0.4);')
  })
})

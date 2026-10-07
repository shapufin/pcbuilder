import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  buildThemeCss,
  resolveTheme,
} from '@buildmyrig/plugin-pages'

const findGlobal = vi.fn()

vi.mock('./shop', () => ({
  getPayloadClient: async () => ({ findGlobal }),
}))

const { getThemeCss, getThemeSkinCss, getThemeAssets, THEME_BOOT_SCRIPT } =
  await import('./theme.server')

/**
 * Phase 5 Step C (entry 21) - app-side theme accessor. Same never-throw
 * contract as getSiteSettings (root layout must render with the DB down),
 * plus an invariant test: the rig-dark preset defaults in resolveTheme must
 * not drift from the static values in @buildmyrig/ui/tokens.css (the <style>
 * block overrides tokens.css only for admin-edited values).
 */
describe('getThemeCss - server theme injection', () => {
  beforeEach(() => {
    findGlobal.mockReset()
  })

  it('#139 returns a :root block from the theme global', async () => {
    findGlobal.mockResolvedValue({ preset: 'dark', colors: { bg: '#112233' } })
    const css = await getThemeCss()
    expect(findGlobal).toHaveBeenCalledWith({ slug: 'theme' })
    expect(css.startsWith(':root{')).toBe(true)
    expect(css).toContain('--color-bg: #112233;')
    expect(css).toContain('--color-primary: #6468f2;')
  })

  it('#139b payload failure falls back to default theme CSS, never throws', async () => {
    findGlobal.mockRejectedValue(new Error('no such table: globals'))
    const css = await getThemeCss()
    expect(css).toContain(`--color-bg: ${DEFAULT_THEME.colors.bg};`)
    expect(css.startsWith(':root{')).toBe(true)
  })

  it('#139c rig-dark preset defaults match the static tokens.css values (no drift)', () => {
    const require = createRequire(import.meta.url)
    const tokensPath = require.resolve('@buildmyrig/ui/tokens.css')
    const css = fs.readFileSync(tokensPath, 'utf8')
    const value = (name: string): string | null => {
      const m = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))
      return m ? m[1]!.trim() : null
    }
    const resolved = resolveTheme(null)
    const kebab = (s: string): string => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    for (const [key, val] of Object.entries(resolved.colors)) {
      expect(value(`--color-${kebab(key)}`), `tokens.css --color-${kebab(key)}`).toBe(val)
    }
    for (const key of ['sm', 'md', 'lg'] as const) {
      expect(value(`--radius-${key}`), `tokens.css --radius-${key}`).toBe(resolved.radius[key])
    }
    // Font wiring drift guard (entry 51): the tokens.css statics must lead
    // with the next/font variables layout.tsx declares on <html> — nothing
    // else checks this chain.
    expect(value('--font-sans'), 'tokens.css --font-sans').toMatch(/^var\(--font-inter,/)
    expect(value('--font-display'), 'tokens.css --font-display').toBe(
      'var(--font-heading, var(--font-space-grotesk, var(--font-sans)))',
    )
  })

  it('#368 layout.tsx declares the next/font variables tokens.css wraps', () => {
    // The --font-sans/--font-display chains resolve through the variables
    // next/font puts on <html> — renaming `variable:` there silently falls
    // back to system fonts (entry-55 review).
    const layout = fs.readFileSync(new URL('../app/(frontend)/layout.tsx', import.meta.url), 'utf8')
    expect(layout).toContain("variable: '--font-inter'")
    expect(layout).toContain("variable: '--font-space-grotesk'")
  })

  it('#369 getThemeAssets: a skin fs failure skips ONLY the overlay, keeps preset vars', async () => {
    vi.resetModules()
    const fresh = await import('./theme.server')
    findGlobal.mockResolvedValue({ preset: 'midnight' })
    // Skin failure must cover BOTH load paths: the require.resolve read and
    // the import.meta.url walk-up fallback (existsSync false → dir missing).
    const spyRead = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('corrupt skin')
    })
    const spyExists = vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    const assets = await fresh.getThemeAssets()
    spyRead.mockRestore()
    spyExists.mockRestore()
    expect(assets.skin).toBe('')
    // Midnight preset vars, not a silent revert to the rig-dark default —
    // exact-equality pins it (every preset emits the same extras KEYS).
    expect(assets.css).toBe(buildThemeCss(resolveTheme({ preset: 'midnight' })))
  })

  it('#370 getThemeAssets: payload failure falls back to the default theme', async () => {
    findGlobal.mockRejectedValue(new Error('no such table: globals'))
    const assets = await getThemeAssets()
    expect(assets.css).toContain(`--color-bg: ${DEFAULT_THEME.colors.bg};`)
    // rig-dark ships a skin — the overlay is part of the default fallback.
    expect(assets.skin).toContain('::selection')
  })

  it('#290 preset extras (scrim/glow/soft surfaces) flow through getThemeCss', async () => {
    findGlobal.mockResolvedValue({ preset: 'midnight' })
    const css = await getThemeCss()
    expect(css).toContain('--color-scrim:')
    expect(css).toContain('--color-primary-glow:')
  })

  it('#291 getThemeSkinCss returns the preset skin overlay; empty when none or on failure', async () => {
    findGlobal.mockResolvedValue({ preset: 'midnight' })
    const skin = await getThemeSkinCss()
    expect(skin.length).toBeGreaterThan(0)
    expect(skin).toContain('.btn')
    findGlobal.mockResolvedValue({ preset: 'dark' })
    expect(await getThemeSkinCss()).toBe('')
    findGlobal.mockRejectedValue(new Error('no such table: globals'))
    expect(await getThemeSkinCss()).toBe('')
  })

  it('#319 rig-dark preset serves the skin overlay and next/font default stack', async () => {
    findGlobal.mockResolvedValue({ preset: 'rig-dark' })
    const skin = await getThemeSkinCss()
    expect(skin.length).toBeGreaterThan(0)
    expect(skin).toContain('::selection')
    const css = await getThemeCss()
    expect(css).toContain('--font-body: var(--font-inter)')
  })

  it('#292 rig-dark preset extras match the tokens.css additive vars (no drift)', () => {
    const require = createRequire(import.meta.url)
    const tokensPath = require.resolve('@buildmyrig/ui/tokens.css')
    const css = fs.readFileSync(tokensPath, 'utf8')
    const value = (name: string): string | null => {
      const m = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))
      return m ? m[1]!.trim() : null
    }
    for (const [key, val] of Object.entries(DEFAULT_THEME.extras)) {
      expect(value(`--color-${key}`), `tokens.css --color-${key}`).toBe(val)
    }
  })
})

/**
 * Visitor theme toggle (entry 60) — the layout ships a second complete
 * preset in #theme-alt so a header toggle can swap palettes client-side.
 * Alt pairing: admin 'light' -> 'dark'; every dark-flavored preset ->
 * 'light'. Admin color overrides stay scoped to the admin preset.
 */
describe('getThemeAssets - visitor alt theme (entry 60)', () => {
  beforeEach(() => {
    findGlobal.mockReset()
  })

  it('#402 dark-flavored admin preset pairs alt=light, labels included', async () => {
    findGlobal.mockResolvedValue({ preset: 'rig-dark' })
    const assets = await getThemeAssets()
    expect(assets.altLabel).toBe(THEME_PRESETS.light.label)
    expect(assets.defaultLabel).toBe(THEME_PRESETS['rig-dark'].label)
    expect(assets.altCss).toContain(`--color-bg: ${THEME_PRESETS.light.colors.bg};`)
    expect(assets.altCss).toContain('--font-body:')
  })

  it('#403 admin light preset pairs alt=dark (Precision Dark)', async () => {
    findGlobal.mockResolvedValue({ preset: 'light' })
    const assets = await getThemeAssets()
    expect(assets.altLabel).toBe(THEME_PRESETS.dark.label)
    expect(assets.altCss).toContain(`--color-bg: ${THEME_PRESETS.dark.colors.bg};`)
  })

  it('#404 admin color overrides do not leak into the alt preset', async () => {
    findGlobal.mockResolvedValue({ preset: 'rig-dark', colors: { bg: '#010203' } })
    const assets = await getThemeAssets()
    expect(assets.css).toContain('--color-bg: #010203;')
    expect(assets.altCss).not.toContain('#010203')
    expect(assets.altCss).toContain(`--color-bg: ${THEME_PRESETS.light.colors.bg};`)
  })

  it('#405 payload failure still emits the default pairing, never throws', async () => {
    findGlobal.mockRejectedValue(new Error('no such table: globals'))
    const assets = await getThemeAssets()
    expect(assets.altLabel).toBe(THEME_PRESETS.light.label)
    expect(assets.altCss).toContain(`--color-bg: ${THEME_PRESETS.light.colors.bg};`)
  })

  it('#406 THEME_BOOT_SCRIPT flips media attrs on the stored alt choice', () => {
    expect(THEME_BOOT_SCRIPT).toContain('bmr_theme')
    expect(THEME_BOOT_SCRIPT).toContain('theme-vars')
    expect(THEME_BOOT_SCRIPT).toContain('theme-alt')
    expect(THEME_BOOT_SCRIPT).toContain('not all')
  })
})

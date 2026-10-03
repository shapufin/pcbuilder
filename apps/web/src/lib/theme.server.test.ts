import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { DEFAULT_THEME, resolveTheme } from '@buildmyrig/plugin-pages'

const findGlobal = vi.fn()

vi.mock('./shop', () => ({
  getPayloadClient: async () => ({ findGlobal }),
}))

const { getThemeCss } = await import('./theme.server')

/**
 * Phase 5 Step C (entry 21) - app-side theme accessor. Same never-throw
 * contract as getSiteSettings (root layout must render with the DB down),
 * plus an invariant test: the dark preset defaults in resolveTheme must not
 * drift from the static values in @buildmyrig/ui/tokens.css (the <style>
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

  it('#139c dark preset defaults match the static tokens.css values (no drift)', () => {
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
  })
})

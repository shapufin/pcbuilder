import { describe, expect, it } from 'vitest'
import { ACCENT_PALETTE, builderPaletteVars } from './builder-palette'

/**
 * Entry 131 — builder designs inherit the site theme; a design that needs the
 * mockup's contrast ladder declares `palette: 'accent'` and gets this ramp.
 * Every value must be a color-mix over LIVE theme vars: a hardcoded color
 * would freeze the design against the admin theme and the visitor toggle.
 */
describe('builder palette ramp (entry 131)', () => {
  it('#678 inherit mode emits no variables (design rides the theme untouched)', () => {
    expect(builderPaletteVars('inherit')).toEqual({})
  })

  it('#679 accent mode emits the full elevation + line ramp', () => {
    const vars = builderPaletteVars('accent')
    expect(Object.keys(vars).sort()).toEqual(Object.keys(ACCENT_PALETTE).sort())
    expect(vars['--bd-elev-1']).toBeDefined()
    expect(vars['--bd-elev-2']).toBeDefined()
    expect(vars['--bd-elev-3']).toBeDefined()
    expect(vars['--bd-line']).toBeDefined()
    expect(vars['--bd-line-soft']).toBeDefined()
    expect(vars['--bd-line-accent']).toBeDefined()
  })

  it('#680 every ramp value derives from theme vars, never a literal color', () => {
    for (const [name, value] of Object.entries(ACCENT_PALETTE)) {
      expect(value, `${name} must mix theme vars`).toContain('var(--color-')
      expect(value, `${name} must be a color-mix`).toContain('color-mix(')
      expect(value, `${name} must not hardcode a hex`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('#681 accent mode returns a fresh copy (callers mutate inline styles)', () => {
    const a = builderPaletteVars('accent')
    a['--bd-line'] = 'red'
    expect(builderPaletteVars('accent')['--bd-line']).toBe(ACCENT_PALETTE['--bd-line'])
  })
})

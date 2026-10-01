import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

/**
 * Step C (entry 21) - design tokens starter from 07-ux-plan.md §tokens.
 * tokens.css is the SINGLE place token values are defined; components and
 * the theme global may only read them. Names are the plan's contract.
 */

const tokensUrl = new URL('./tokens.css', import.meta.url)
const readTokens = (): string => {
  try {
    return fs.readFileSync(tokensUrl, 'utf8')
  } catch {
    return ''
  }
}
const tokensCss = readTokens()

const valueOf = (name: string): string | null => {
  const m = tokensCss.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))
  return m ? m[1]!.trim() : null
}

const COLOR_TOKENS = [
  '--color-bg',
  '--color-surface',
  '--color-surface-raised',
  '--color-surface-hover',
  '--color-border',
  '--color-border-strong',
  '--color-text',
  '--color-text-muted',
  '--color-primary',
  '--color-primary-strong',
  '--color-primary-hover',
  '--color-primary-hover-strong',
  '--color-on-primary',
  '--color-success',
  '--color-success-strong',
  '--color-warning',
  '--color-danger',
  '--color-info',
]

const SPACE_TOKENS: Record<string, string> = {
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '24px',
  '--space-6': '32px',
  '--space-7': '48px',
  '--space-8': '64px',
  '--space-9': '96px',
  '--space-10': '128px',
  '--space-11': '160px',
  '--space-12': '192px',
}

const TEXT_TOKENS: Record<string, string> = {
  '--text-xs': '12px',
  '--text-sm': '14px',
  '--text-base': '16px',
  '--text-lg': '18px',
  '--text-xl': '20px',
  '--text-2xl': '24px',
  '--text-3xl': '30px',
  '--text-4xl': '36px',
  '--text-5xl': '48px',
  '--text-6xl': '60px',
}

const RADIUS_TOKENS: Record<string, string> = {
  '--radius-sm': '4px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--radius-full': '9999px',
}

const MOTION_TOKENS: Record<string, string> = {
  '--duration-fast': '150ms',
  '--duration-base': '250ms',
  '--duration-slow': '350ms',
  '--ease-out': 'cubic-bezier(.16,1,.3,1)',
}

describe('design tokens - packages/ui/tokens.css (07-ux-plan §tokens)', () => {
  it('#131 every planned token name is defined with a non-empty value', () => {
    const all = [...COLOR_TOKENS, ...Object.keys(SPACE_TOKENS), ...Object.keys(TEXT_TOKENS), ...Object.keys(RADIUS_TOKENS), ...Object.keys(MOTION_TOKENS), '--shadow-sm', '--shadow-md', '--shadow-lg']
    expect(tokensCss, 'tokens.css missing or unreadable').not.toBe('')
    for (const name of all) {
      expect(valueOf(name), `token ${name} not defined`).toBeTruthy()
    }
  })

  it('#132 token values match the plan starter palette', () => {
    for (const [name, expected] of Object.entries({ ...SPACE_TOKENS, ...TEXT_TOKENS, ...RADIUS_TOKENS, ...MOTION_TOKENS })) {
      expect(valueOf(name), `${name} value`).toBe(expected)
    }
    for (const name of COLOR_TOKENS) {
      expect(valueOf(name), `${name} must be a hex color`).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
    for (const name of ['--shadow-sm', '--shadow-md', '--shadow-lg']) {
      expect(valueOf(name), `${name} shadow`).toMatch(/box-shadow|^\d/)
    }
  })
})

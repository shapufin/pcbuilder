import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Audit 2026-11-18 (cross-cutting): a `var(--name)` with no fallback and no
 * definition anywhere makes the whole declaration invalid — the browser drops
 * it silently (e.g. `padding: var(--space-16)` → no padding, which overflowed
 * /aether-lab at 280px). Every fallback-less custom property must resolve to
 * a token, a stylesheet definition, or a known runtime-injected variable.
 */
const SRC = path.resolve(__dirname, '..')
const TOKENS = path.resolve(__dirname, '../../../../packages/ui/tokens.css')

// Injected at runtime: theme global (<style id="theme-vars">) and inline styles.
const RUNTIME = new Set(['--font-body', '--font-heading', '--x'])
// Payload admin's own theme variables (defined by @payloadcms/ui styles).
const PAYLOAD = /^--theme-(text|bg|input-bg|elevation-\d+|(error|success|warning)-\d+|border-color)$/

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : []
  })

describe('CSS custom properties resolve (audit 2026-11-18)', () => {
  it('#763 no fallback-less var() points at an undefined property', () => {
    const files = walk(SRC)
    const defined = new Set<string>()
    for (const f of [TOKENS, ...files]) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]!)
    }
    const missing: string[] = []
    for (const f of files) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/var\((--[a-z0-9-]+)\s*\)/g)) {
        const name = m[1]!
        if (!defined.has(name) && !RUNTIME.has(name) && !PAYLOAD.test(name)) {
          missing.push(`${path.relative(SRC, f)}: ${name}`)
        }
      }
    }
    expect([...new Set(missing)]).toEqual([])
  })
})

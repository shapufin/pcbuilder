import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Encoding purity guard (audit 2026-10-22, item 681).
 *
 * A Windows editor round-trip through CP1252 corrupts UTF-8 source: the euro
 * sign becomes three bytes, an em dash becomes three bytes, and the file gains
 * a BOM. This already hit the seeded homepage copy (item 677) and then
 * `packages/lib/src/margin.test.ts` itself. Cheap to detect, invisible otherwise.
 */
const ROOTS = [
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../../../../packages/lib/src'),
  path.resolve(__dirname, '../../../../packages/plugin-pages/src'),
  path.resolve(__dirname, '../../../../packages/plugin-shop/src'),
  path.resolve(__dirname, '../../../../packages/plugin-pc-builder/src'),
]

const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', 'coverage'])
const EXT = new Set(['.ts', '.tsx', '.css', '.mjs'])

// Built from code points so this file never contains the raw markers it hunts.
const MARKERS = [
  String.fromCharCode(0x00e2, 0x20ac), // mangled em dash / curly quote / euro
  String.fromCharCode(0x00c3, 0x00a2), // mangled A-tilde / cent prefix
  String.fromCharCode(0x00c2, 0x00a0), // mangled non-breaking space
]

const walk = (dir: string, out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out)
    } else if (EXT.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name))
    }
  }
  return out
}

describe('source encoding purity', () => {
  it('#681 no source file carries a BOM or CP1252 mojibake', () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        const text = fs.readFileSync(file, 'utf8')
        const rel = path.relative(path.resolve(__dirname, '../../../..'), file)
        if (text.charCodeAt(0) === 0xfeff) offenders.push(`${rel} (BOM)`)
        const marker = MARKERS.find((m) => text.includes(m))
        if (marker) offenders.push(`${rel} (mojibake)`)
      }
    }
    expect(offenders, `corrupted encoding:\n${offenders.join('\n')}`).toHaveLength(0)
  })
})

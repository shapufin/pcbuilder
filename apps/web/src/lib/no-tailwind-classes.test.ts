import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Audit 2026-11-18 H4: this project ships no Tailwind (AGENTS.md), yet the
 * Aether theme was written with ~130 Tailwind utilities — all silent no-ops
 * (`flex` computed to `display:block`). Guard every TSX file under src/ so a
 * bare utility class can never ship again; use semantic or ae-u-* classes.
 */
const SRC = path.resolve(__dirname, '..')
const UTILITY =
  /^(flex|inline-flex|grid|items-(center|start|end|baseline)|justify-(between|center|end|start)|gap-\d|p[xytblr]?-\d|m[xytblr]?-\d|text-(zinc|slate|gray|amber|cyan|emerald|rose|white|black)|bg-(zinc|slate|gray|amber|cyan|emerald|rose|white|black)|rounded(-(sm|md|lg|xl|full))?|(sm|md|lg|xl):.+|w-\d|h-\d|col-span-\d|grid-cols-\d|space-[xy]-\d|tracking-\w+|font-(bold|semibold|mono)|uppercase|truncate)$/

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p)
    return p.endsWith('.tsx') && !p.endsWith('.test.tsx') ? [p] : []
  })

describe('no Tailwind utility classes (audit 2026-11-18 H4)', () => {
  it('#761 no TSX className uses a bare Tailwind utility', () => {
    const offenders: string[] = []
    for (const file of walk(SRC)) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const value = (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, ' ')
        for (const tok of value.split(/\s+/)) {
          if (UTILITY.test(tok)) offenders.push(`${path.relative(SRC, file)}: ${tok}`)
        }
      }
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })
})

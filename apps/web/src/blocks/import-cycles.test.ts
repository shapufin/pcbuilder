import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Audit 2026-11-18 R6: container blocks (Columns, Section) and the rich-text
 * converters imported the renderer/registry, which imports them back — three
 * module cycles (init-order hazards, change cascades). Nested rendering now
 * goes through `nested.ts`, which imports neither.
 */
const runtimeImports = (file: string): string[] =>
  [...fs.readFileSync(path.join(__dirname, file), 'utf8').matchAll(/^import (?!type )[^'"]*['"]([^'"]+)['"]/gm)].map(
    (m) => m[1]!,
  )

describe('block module graph (audit 2026-11-18 R6)', () => {
  it('#764 leaf blocks never import the renderer or the registry at runtime', () => {
    for (const file of ['components/Columns.tsx', 'components/Section.tsx', 'components/RichTextBlock.tsx', 'lexical-converters.tsx', 'nested.ts']) {
      const imports = runtimeImports(file)
      expect(imports.filter((i) => /(^|\/)(renderBlocks|resolveBlock|registry)$/.test(i)), file).toEqual([])
    }
  })
})

import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import path from 'node:path'

/**
 * Step C (entry 21) - enforceable "no raw hex in components" rule.
 * The theme system only works if components read tokens
 * (var(--color-*)) instead of literal colors; ESLint enforces it for
 * TS/TSX (raw hex in CSS is covered by css-token-purity.test.ts).
 * Test files are exempt so fixtures/validators can use literals.
 */
const lint = async (code: string) => {
  // Shared instance: ESLint cold start (config+parser load) is ~4s, which
  // busts vitest's 5s default under turbo-parallel load - one load per file.
  const [result] = await eslint.lintText(code, { filePath: 'src/__hex_rule_probe__.tsx' })
  return result?.messages ?? []
}
const eslint = new ESLint({ cwd: path.resolve(__dirname, '../..') })

describe('no-raw-hex lint rule', () => {
  it('#140 flags raw hex literals in component code', async () => {
    // 3-, 6- and 8-digit forms must all be caught — the migration's dominant
    // form is 6-digit (#ff0000), so asserting merely ">0" would let it slip.
    const messages = await lint(
      `export const P = { color: '#ff0000', border: '1px solid #abc', overlay: '#11223344' }\n`,
    )
    const hits = messages.filter((m) => /raw hex/i.test(m.message))
    expect(hits.length, JSON.stringify(messages)).toBe(3)
  }, 30_000)

  it('#140b allows token references and non-color strings', async () => {
    const messages = await lint(
      `export const P = { color: 'var(--color-primary)', label: 'Build #1 rig', gap: 8 }\n`,
    )
    expect(messages.filter((m) => /hex|#[0-9a-fA-F]/i.test(m.message))).toHaveLength(0)
  }, 30_000)
})

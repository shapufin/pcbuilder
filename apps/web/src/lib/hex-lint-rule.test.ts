import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import fs from 'node:fs'
import path from 'node:path'
import { noRawHexConfig } from '../../eslint-rules/no-raw-hex.mjs'

/**
 * Step C (entry 21) - enforceable "no raw hex in components" rule.
 * The theme system only works if components read tokens
 * (var(--color-*)) instead of literal colors; ESLint enforces it for
 * TS/TSX (raw hex in CSS is covered by css-token-purity.test.ts).
 * Test files are exempt so fixtures/validators can use literals.
 *
 * The rule data is imported from the SAME module eslint.config.mjs spreads
 * in, and ESLint runs with `overrideConfigFile: true` + a bare
 * languageOptions block. Booting the real flat config here
 * (eslint-config-next + typescript-eslint ≈ 4 s cold) under turbo-parallel
 * load exceeded vitest's 30 s timeout - the #140 flake. #140c pins the
 * config wiring + the test-file exemption instead.
 */
const cwd = path.resolve(__dirname, '../..')
const eslint = new ESLint({
  cwd,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['src/**/*.tsx'],
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    ...noRawHexConfig,
  ],
})

const lint = async (code: string, filePath = 'src/__hex_rule_probe__.tsx') => {
  const [result] = await eslint.lintText(code, { filePath })
  return result?.messages ?? []
}

describe('no-raw-hex lint rule', () => {
  it('#140 flags raw hex literals in component code', async () => {
    // 3-, 6- and 8-digit forms must all be caught — the migration's dominant
    // form is 6-digit (#ff0000), so asserting merely ">0" would let it slip.
    const messages = await lint(
      `export const P = { color: '#ff0000', border: '1px solid #abc', overlay: '#11223344' }\n`,
    )
    const hits = messages.filter((m) => /raw hex/i.test(m.message))
    expect(hits.length, JSON.stringify(messages)).toBe(3)
  }, 10_000)

  it('#140b allows token references and non-color strings', async () => {
    const messages = await lint(
      `export const P = { color: 'var(--color-primary)', label: 'Build #1 rig', gap: 8 }\n`,
    )
    expect(messages.filter((m) => /hex|#[0-9a-fA-F]/i.test(m.message))).toHaveLength(0)
  }, 10_000)

  it('#140c wired into eslint.config.mjs and test files stay exempt', async () => {
    const configSource = fs.readFileSync(path.join(cwd, 'eslint.config.mjs'), 'utf8')
    expect(configSource).toContain('./eslint-rules/no-raw-hex.mjs')
    expect(configSource).toContain('...noRawHexConfig')
    const shared = JSON.stringify(noRawHexConfig)
    expect(shared).toContain('.test.*')
    // exemption: hex inside a test file produces no raw-hex hit
    const messages = await lint(
      `export const P = { color: '#ff0000' }\n`,
      'src/__hex_rule_probe__.test.tsx',
    )
    expect(messages.filter((m) => /raw hex/i.test(m.message))).toHaveLength(0)
  }, 10_000)
})

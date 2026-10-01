/**
 * Entry 21 (theme system): components read design tokens from
 * @buildmyrig/ui/tokens.css — raw hex literals are banned so admin theme
 * edits actually apply. CSS hex is covered by the css-token-purity unit
 * test (ESLint does not parse stylesheets).
 *
 * Lives in its own module so hex-lint-rule.test.ts can exercise the EXACT
 * config object eslint.config.mjs registers, without booting the full flat
 * config (eslint-config-next + typescript-eslint ≈ 4 s cold start, which
 * under turbo-parallel load blew past vitest's 30 s timeout — the #140
 * flake). The wiring check in that test pins eslint.config.mjs to this file.
 */
export const noRawHexConfig = [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message:
            'Raw hex colors are banned — use a design token, e.g. var(--color-primary) from @buildmyrig/ui/tokens.css (entry 21).',
        },
      ],
    },
  },
  {
    // Test fixtures and validators may reference literals.
    files: ['src/**/*.test.*', 'src/**/*.spec.*'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]

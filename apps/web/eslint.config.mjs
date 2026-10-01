import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...nextCoreWebVitals,
  ...tseslint.configs.recommended,
  globalIgnores([
    '.next/**',
    'dist/**',
    'node_modules/**',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/app/(payload)/admin/importMap.js',
  ]),
  {
    rules: {
      // Payload collection configs legitimately use `any` casts at plugin
      // boundaries; keep them visible but non-blocking.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      // `as never` is the established pattern in this repo for payload's
      // narrowed field types.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      'prefer-const': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Entry 21 (theme system): components read design tokens from
    // @buildmyrig/ui/tokens.css — raw hex literals are banned so admin
    // theme edits actually apply. CSS hex is covered by the
    // css-token-purity unit test (ESLint does not parse stylesheets).
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
])

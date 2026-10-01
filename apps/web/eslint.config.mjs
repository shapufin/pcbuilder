import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import tseslint from 'typescript-eslint'
import { noRawHexConfig } from './eslint-rules/no-raw-hex.mjs'

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
  // Entry 21 (theme system): raw-hex ban for src/** + test-file exemption.
  // Shared with hex-lint-rule.test.ts via ./eslint-rules/no-raw-hex.mjs so
  // the unit test exercises the real selector without booting this config.
  ...noRawHexConfig,
])

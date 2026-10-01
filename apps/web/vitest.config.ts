import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Vitest scope for apps/web unit tests. Kept explicit so `e2e/*.spec.ts`
 * (Playwright specs, run via `pnpm test:e2e`) is not picked up by `pnpm test`.
 * The `@` alias mirrors tsconfig `paths` so components that import `@/lib/…`
 * resolve under vitest the same way they do under Next/tsc.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})

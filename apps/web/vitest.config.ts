import { defineConfig } from 'vitest/config'

/**
 * Vitest scope for apps/web unit tests. Kept explicit so `e2e/*.spec.ts`
 * (Playwright specs, run via `pnpm test:e2e`) is not picked up by `pnpm test`.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})

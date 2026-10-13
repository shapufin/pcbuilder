import { defineConfig, devices } from '@playwright/test'

/**
 * Entry-16 e2e suite (Phase-4 Playwright gate, 15-delivery-phases.md).
 * Runs against the production build (`pnpm build` first); reuses an already
 * running server on :3000. Workers: 1 — tests share the dev DB and the
 * register endpoint's 5/min/IP limiter, so they must not run concurrently.
 */
// PLAYWRIGHT_BASE_URL lets the suite run against a non-default port (e.g. a
// prod build on :3001 when :3000 is taken by another project).
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 90_000,
    env: {
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'dev_secret_key_for_testing_purposes_only_123456',
    },
  },
})

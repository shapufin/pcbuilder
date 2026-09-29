import { defineConfig, devices } from '@playwright/test'

/**
 * Entry-16 e2e suite (Phase-4 Playwright gate, 15-delivery-phases.md).
 * Runs against the production build (`pnpm build` first); reuses an already
 * running server on :3000. Workers: 1 — tests share the dev DB and the
 * register endpoint's 5/min/IP limiter, so they must not run concurrently.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 90_000,
  },
})

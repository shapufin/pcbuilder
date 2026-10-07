import { test, expect } from '@playwright/test'

/**
 * Entry 71 — Nexus preset swap e2e (plan §123). Switches the Theme global
 * to `nexus` via the REST API, asserts /explorer renders the nx-* DOM
 * (force-dynamic route — no ISR wait), then restores the prior preset.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@buildmyrig.test'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!'

test.describe('nexus preset swap', () => {
  test('POST theme→nexus renders nx DOM on /explorer, restore works', async ({
    page,
    request,
  }) => {
    // 1. Admin login → token for the globals update.
    //    Payload globals REST update is POST, not PATCH (gotcha #14).
    const login = await request.post('/api/users/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (!login.ok()) test.skip(true, 'seeded admin unavailable — run pnpm seed')
    const { token } = await login.json()
    const auth = { Authorization: `JWT ${token}` }

    // 2. Read current preset so we can restore it.
    const before = await request.get('/api/globals/theme', { headers: auth })
    expect(before.ok()).toBeTruthy()
    const beforePreset = (await before.json()).preset as string

    try {
      const patched = await request.post('/api/globals/theme', {
        headers: { ...auth, 'Content-Type': 'application/json' },
        data: { preset: 'nexus' },
      })
      expect(patched.ok()).toBeTruthy()

      // 3. /explorer is force-dynamic — the preset swap takes effect
      //    immediately, no ISR wait.
      await page.goto('/explorer')
      await expect(page.locator('body')).toHaveAttribute('data-theme-pack', 'nexus')
      await expect(page.locator('.nx-slot').first()).toBeVisible()
      await expect(page.locator('.nx-explorer__bar')).toContainText(/slots mounted/i)
      await expect(
        page.getByRole('link', { name: /configure in builder/i }),
      ).toHaveAttribute('href', '/builder')
    } finally {
      // 4. Restore whatever preset was live before this spec ran.
      await request.post('/api/globals/theme', {
        headers: { ...auth, 'Content-Type': 'application/json' },
        data: { preset: beforePreset },
      })
    }
  })
})

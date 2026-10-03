import type { Page } from '@playwright/test'

const ADMIN = { email: 'admin@buildmyrig.test', password: 'Password123!' }
const ORIGIN = { Origin: 'http://localhost:3000' }

/**
 * Pin the builder design via the plugin-owned global (entry 54 P4). The
 * design resolves server-side per request, so a spec can't rely on whatever
 * the shared dev DB happens to hold — each design-dependent spec calls this
 * before navigating. Cookie-authed REST needs the Origin header (gotchas).
 */
export async function setBuilderDesign(
  page: Page,
  design: 'classic' | 'rig-studio',
): Promise<void> {
  const login = await page.request.post('/api/users/login', {
    data: ADMIN,
    headers: ORIGIN,
  })
  if (!login.ok()) throw new Error(`admin login failed: ${login.status()}`)
  // Payload globals REST update is POST, not PATCH (gotchas).
  const res = await page.request.post('/api/globals/builder-settings', {
    data: { design },
    headers: ORIGIN,
  })
  if (!res.ok()) {
    throw new Error(`builder-settings update failed: ${res.status()} ${await res.text()}`)
  }
}

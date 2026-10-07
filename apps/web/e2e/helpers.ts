import { test, type APIRequestContext } from '@playwright/test'

/**
 * Shared e2e helpers — the suite runs against the shared dev DB (single
 * worker), so specs that mutate globals must restore what they found.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@buildmyrig.test'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!'

/** Seeded admin JWT header, or null when the DB isn't seeded. */
export const adminAuth = async (
  request: APIRequestContext,
): Promise<{ Authorization: string } | null> => {
  const login = await request.post('/api/users/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  if (!login.ok()) return null
  const { token } = await login.json()
  return { Authorization: `JWT ${token}` }
}

export const getThemePreset = async (
  request: APIRequestContext,
  auth: { Authorization: string },
): Promise<string> => {
  const res = await request.get('/api/globals/theme', { headers: auth })
  if (!res.ok()) throw new Error(`theme global read failed: ${res.status()}`)
  return (await res.json()).preset as string
}

export const setThemePreset = async (
  request: APIRequestContext,
  auth: { Authorization: string },
  preset: string,
): Promise<void> => {
  // Payload globals REST update is POST, not PATCH (gotcha #14). The theme
  // afterChange hook revalidates the layout, so cached pages re-render too.
  const res = await request.post('/api/globals/theme', {
    headers: { ...auth, 'Content-Type': 'application/json' },
    data: { preset },
  })
  if (!res.ok()) throw new Error(`theme preset update failed: ${res.status()}`)
}

/**
 * Entry 72 — pin the admin preset to the classic chrome (`rig-dark`: default
 * preset, no component `pack`) for specs asserting the classic header/footer
 * contract. The seed now defaults to `nexus`, whose header swaps the "Cart"
 * link for a drawer button and the inline searchbox for a ⌘K modal trigger.
 * The prior preset is restored in afterAll.
 */
export const withClassicChrome = () => {
  let prior: string | null = null
  test.beforeAll(async ({ request }) => {
    const auth = await adminAuth(request)
    if (!auth) return
    prior = await getThemePreset(request, auth)
    if (prior !== 'rig-dark') await setThemePreset(request, auth, 'rig-dark')
  })
  test.afterAll(async ({ request }) => {
    if (!prior || prior === 'rig-dark') return
    const auth = await adminAuth(request)
    if (auth) await setThemePreset(request, auth, prior)
  })
}

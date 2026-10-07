import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@admin.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin'

test.describe('Admin Route Crawl & Error Detection', () => {
  test('crawls all admin collections, globals, and custom views without runtime errors', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000)

    const pageErrors: Array<{ url: string; error: string }> = []
    const consoleErrors: Array<{ url: string; text: string }> = []

    page.on('pageerror', (err) => {
      pageErrors.push({ url: page.url(), error: err.message })
      console.error(`[PAGE ERROR on ${page.url()}]:`, err.message)
    })

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        consoleErrors.push({ url: page.url(), text })
        console.error(`[CONSOLE ERROR on ${page.url()}]:`, text)
      }
    })

    // 1. Log in
    await page.goto('/admin/login', { waitUntil: 'networkidle' })
    if (page.url().includes('/admin/login')) {
      await page.fill('input#field-email', ADMIN_EMAIL)
      await page.fill('input#field-password', ADMIN_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/admin**', { timeout: 15_000 })
    }

    // Active collections visible in admin UI
    const collections = [
      'users',
      'pages',
      'products',
      'categories',
      'brands',
      'orders',
      'transactions',
      'components',
      'component-categories',
      'compatibility-rules',
      'build-templates',
      'configured-builds',
      'media',
      'attribute-types',
      'attribute-values',
    ]

    const globals = [
      'site-settings',
      'theme',
      'mega-menu',
      'builder-settings',
    ]

    const customViews = [
      '/admin',
      '/admin/account',
      '/admin/compatibility-rules-manager',
      '/admin/build-stats',
    ]

    const routes: string[] = [...customViews]

    for (const g of globals) {
      routes.push(`/admin/globals/${g}`)
    }

    // Auth for fetching sample IDs
    let authHeader: Record<string, string> = {}
    const loginRes = await request.post('/api/users/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (loginRes.ok()) {
      const { token } = await loginRes.json()
      authHeader = { Authorization: `JWT ${token}` }
    }

    for (const c of collections) {
      routes.push(`/admin/collections/${c}`)
      routes.push(`/admin/collections/${c}/create`)

      try {
        const res = await request.get(`/api/${c}?limit=1&depth=0`, { headers: authHeader })
        if (res.ok()) {
          const data = await res.json()
          if (data.docs && data.docs.length > 0) {
            routes.push(`/admin/collections/${c}/${data.docs[0].id}`)
          }
        }
      } catch {
        // ignore
      }
    }

    console.log(`Starting crawl across ${routes.length} admin routes...`)

    const failures: Array<{ route: string; error: string }> = []

    for (const route of routes) {
      const pErrCount = pageErrors.length
      const cErrCount = consoleErrors.length

      try {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 10_000 })
        await page.waitForTimeout(600)

        const status = response?.status() ?? 0
        const newPErrors = pageErrors.slice(pErrCount)
        const newCErrors = consoleErrors.slice(cErrCount)

        if (status >= 400) {
          failures.push({ route, error: `HTTP status ${status}` })
        } else if (newPErrors.length > 0) {
          failures.push({ route, error: `Page errors: ${newPErrors.map((e) => e.error).join('; ')}` })
        } else if (newCErrors.length > 0) {
          // Check if any critical uncaught errors in console
          const fatal = newCErrors.filter((c) =>
            c.text.includes('TypeError') ||
            c.text.includes('ReferenceError') ||
            c.text.includes('Uncaught') ||
            c.text.includes('Cannot read property') ||
            c.text.includes('is not a function')
          )
          if (fatal.length > 0) {
            failures.push({ route, error: `Console fatal errors: ${fatal.map((f) => f.text).join('; ')}` })
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        failures.push({ route, error: `Navigation failed: ${msg}` })
      }
    }

    if (failures.length > 0) {
      console.error('Crawl Failures Summary:', JSON.stringify(failures, null, 2))
    }

    expect(failures, `Found ${failures.length} failing admin routes: ${JSON.stringify(failures)}`).toEqual([])
  })
})

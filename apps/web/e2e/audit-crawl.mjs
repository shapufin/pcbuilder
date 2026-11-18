/**
 * Full-audit crawl — storefront + authenticated admin, measured at 1440 and 280.
 *
 * Round 1 (2026-10-22) measured overflow and page errors ad hoc; this is the
 * same surface as a reusable harness so a later round can diff against it
 * instead of re-deriving the route list. Complements `audit-browser-verify.mjs`,
 * which covers admin routes only.
 *
 * Run with the dev server up:  node e2e/audit-crawl.mjs
 * Exit code is 1 when any route is non-200, overflows, or throws.
 */
import { chromium } from '@playwright/test'

const BASE_URL = process.env.AUDIT_BASE_URL ?? 'http://localhost:3000'
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@buildmyrig.test'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!'

const STOREFRONT = [
  '/',
  '/shop',
  '/shop/graphics-cards',
  '/product/gaming-keyboard-rgb-pro',
  '/builder',
  '/cart',
  '/checkout',
  '/account',
  '/explorer',
  '/aether-showcase',
  '/about',
  '/wishlist',
]

const ADMIN = [
  '/admin',
  '/admin/collections/products',
  '/admin/collections/products/40',
  '/admin/collections/pages',
  '/admin/collections/pages/8',
  '/admin/collections/orders',
  '/admin/collections/products/trash',
  '/admin/globals/site-settings',
  '/admin/globals/theme',
  '/admin/compatibility-rules-manager',
  '/admin/build-stats',
  '/admin/plugins',
  '/admin/design-system',
]

const VIEWPORTS = [
  { label: '1440', width: 1440, height: 900 },
  { label: '280', width: 280, height: 800 },
]

const browser = await chromium.launch()
const results = []

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)))

  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' })
  if (page.url().includes('/admin/login')) {
    await page.fill('input#field-email', EMAIL)
    await page.fill('input#field-password', PASSWORD)
    await Promise.all([
      // The login URL itself contains /admin — wait for a non-login path.
      page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ])
  }
  if (page.url().includes('/admin/login')) throw new Error('admin login failed')

  for (const route of [...STOREFRONT, ...ADMIN]) {
    errors.length = 0
    let status = 0
    try {
      const res = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 45000 })
      status = res?.status() ?? 0
    } catch (e) {
      results.push({ viewport: viewport.label, route, status: 'NAV_FAIL', overflow: null, errors: [String(e).slice(0, 80)] })
      continue
    }
    await page.waitForTimeout(300)
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    results.push({ viewport: viewport.label, route, status, overflow: Math.max(0, scrollWidth - clientWidth), errors: [...errors] })
  }
  await context.close()
}
await browser.close()

const bad = results.filter((r) => r.status !== 200)
const over = results.filter((r) => typeof r.overflow === 'number' && r.overflow > 0)
const threw = results.filter((r) => r.errors.length)

console.log(`routes measured: ${results.length}`)
console.log(`non-200: ${bad.length}`)
for (const r of bad) console.log(`  ${r.viewport} ${r.route} -> ${r.status}`)
console.log(`overflowing: ${over.length}`)
for (const r of over) console.log(`  ${r.viewport} ${r.route} -> ${r.overflow}px`)
console.log(`page errors: ${threw.length}`)
for (const r of threw) console.log(`  ${r.viewport} ${r.route}: ${r.errors.join(' | ')}`)

process.exit(bad.length + over.length + threw.length === 0 ? 0 : 1)

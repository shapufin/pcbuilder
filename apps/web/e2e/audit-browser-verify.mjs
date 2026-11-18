import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@buildmyrig.test'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!'
const BASE_URL = 'http://localhost:3000'

const PAGES = [
  { name: 'admin-dashboard', path: '/admin' },
  { name: 'compatibility-rules-manager', path: '/admin/compatibility-rules-manager' },
  { name: 'build-stats', path: '/admin/build-stats' },
  { name: 'plugins', path: '/admin/plugins' },
  { name: 'design-system', path: '/admin/design-system' },
  { name: 'account', path: '/admin/account' },
  { name: 'global-site-settings', path: '/admin/globals/site-settings' },
  { name: 'global-theme', path: '/admin/globals/theme' },
  { name: 'global-mega-menu', path: '/admin/globals/mega-menu' },
  { name: 'global-builder-settings', path: '/admin/globals/builder-settings' },
  { name: 'global-store-settings', path: '/admin/globals/store-settings' },
  { name: 'global-packaging-tiers', path: '/admin/globals/packaging-tiers' },
]

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const screenshotDir = path.resolve(process.cwd(), 'screenshots/audit')
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true })
  }

  // 1. Log in
  console.log('Logging in to Payload admin...')
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' })
  if (page.url().includes('/admin/login')) {
    await page.fill('input#field-email', ADMIN_EMAIL)
    await page.fill('input#field-password', ADMIN_PASSWORD)
    // NB: the old `waitForURL('**/admin**')` also matched /admin/login, so the
    // crawl silently stayed anonymous and reported 401/403 as product bugs
    // (audit 2026-10-22). Wait for a URL that is *not* the login page.
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ])
  }
  if (page.url().includes('/admin/login')) {
    throw new Error('admin login failed — crawl would run unauthenticated')
  }
  console.log('Logged in successfully.')

  const results = []

  for (const p of PAGES) {
    console.log(`\nTesting ${p.path}...`)
    const consoleErrors = []
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    }
    const onPageError = (err) => {
      consoleErrors.push(err.message)
    }

    page.on('console', onConsole)
    page.on('pageerror', onPageError)

    // Viewport 1440px
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const screenshot1440 = path.join(screenshotDir, `${p.name}-1440.png`)
    await page.screenshot({ path: screenshot1440, fullPage: false })

    // Check loading & error states
    const statesInfo = await page.evaluate(() => {
      const text = document.body.innerText
      const hasLoadingIndicator = !!(
        document.querySelector('.loading-spinner') ||
        document.querySelector('[data-loading]') ||
        document.querySelector('.skeleton') ||
        document.querySelector('.animate-pulse') ||
        text.includes('Loading...') ||
        text.includes('Loading')
      )
      const hasErrorBanner = !!(
        document.querySelector('.alert-danger') ||
        document.querySelector('[data-error]') ||
        document.querySelector('.bmr-error') ||
        document.querySelector('.error-banner') ||
        text.includes('Error loading') ||
        text.includes('Failed to load')
      )
      return { hasLoadingIndicator, hasErrorBanner }
    })

    // Viewport 280px
    await page.setViewportSize({ width: 280, height: 800 })
    await page.waitForTimeout(500)

    const screenshot280 = path.join(screenshotDir, `${p.name}-280.png`)
    await page.screenshot({ path: screenshot280, fullPage: false })

    // Measure horizontal overflow at 280px
    const overflowInfo = await page.evaluate(() => {
      const docEl = document.documentElement
      const body = document.body
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth)
      const clientWidth = window.innerWidth
      const overflows = scrollWidth > clientWidth + 2

      // Find overflowing elements
      const overflowingElements = []
      const all = document.querySelectorAll('*')
      for (const el of all) {
        const rect = el.getBoundingClientRect()
        if (rect.width > clientWidth + 2 || rect.right > clientWidth + 2) {
          // Identify selector
          const tag = el.tagName.toLowerCase()
          const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''
          const id = el.id ? `#${el.id}` : ''
          const desc = `${tag}${id}${cls.slice(0, 40)}`
          overflowingElements.push({
            desc,
            width: Math.round(rect.width),
            right: Math.round(rect.right),
          })
          if (overflowingElements.length >= 5) break
        }
      }

      return {
        overflows,
        scrollWidth,
        clientWidth,
        overflowDiff: scrollWidth - clientWidth,
        overflowingElements,
      }
    })

    page.off('console', onConsole)
    page.off('pageerror', onPageError)

    results.push({
      page: p.path,
      name: p.name,
      overflows280: overflowInfo.overflows,
      scrollWidth280: overflowInfo.scrollWidth,
      clientWidth280: overflowInfo.clientWidth,
      overflowDiff: overflowInfo.overflowDiff,
      overflowingElements: overflowInfo.overflowingElements,
      consoleErrors: consoleErrors.slice(0, 5),
      statesInfo,
      screenshots: {
        w1440: `${p.name}-1440.png`,
        w280: `${p.name}-280.png`,
      },
    })
  }

  await browser.close()

  console.log('\n=== AUDIT RESULTS SUMMARY ===')
  console.log(JSON.stringify(results, null, 2))

  fs.writeFileSync(
    path.join(screenshotDir, 'browser-audit-results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  )
}

run().catch((err) => {
  console.error('Audit failed:', err)
  process.exit(1)
})

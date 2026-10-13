import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@buildmyrig.test'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!'

test.describe('Admin GUI Interactive Workflow Simulations', () => {
  test('executes key admin GUI workflows end-to-end without errors', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000)

    const pageErrors: Array<{ url: string; error: string }> = []
    const consoleErrors: Array<{ url: string; text: string }> = []

    page.on('pageerror', (err) => {
      pageErrors.push({ url: page.url(), error: err.message })
      console.error(`[WORKFLOW PAGE ERROR on ${page.url()}]:`, err.message)
    })

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        consoleErrors.push({ url: page.url(), text })
      }
    })

    // 1. Initial Login
    await page.goto('/admin/login', { waitUntil: 'networkidle' })
    if (page.url().includes('/admin/login')) {
      await page.fill('input#field-email', ADMIN_EMAIL)
      await page.fill('input#field-password', ADMIN_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 })
      await page.waitForTimeout(1000)
    }

    // Helper: obtain auth token for sample doc API queries
    let authHeader: Record<string, string> = {}
    const loginRes = await request.post('/api/users/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (loginRes.ok()) {
      const { token } = await loginRes.json()
      authHeader = { Authorization: `JWT ${token}` }
    }

    // =========================================================================
    // Workflow 1: Live Compatibility Engine Sandbox on /admin/compatibility-rules-manager
    // =========================================================================
    console.log('[Workflow 1] Testing Compatibility Rule Engine Sandbox...')
    await page.goto('/admin/compatibility-rules-manager', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    const sandbox = page.locator('.bmr-sandbox')
    await expect(sandbox).toBeVisible({ timeout: 10_000 })

    const selects = page.locator('.bmr-sandbox__select')
    await expect(selects).toHaveCount(5)

    const diagTitle = page.locator('.bmr-sandbox__diag-title')
    await expect(diagTitle).toContainText('EVALUATED PIPELINE DIAGNOSTICS')

    const diags = page.locator('.bmr-sandbox__diag')
    await expect(diags.first()).toBeVisible()

    // Test dynamic selection change
    const cpuSelect = selects.nth(0)
    const options = await cpuSelect.locator('option').all()
    if (options.length > 1) {
      const secondOptionVal = await options[1].getAttribute('value')
      if (secondOptionVal) {
        await cpuSelect.selectOption(secondOptionVal)
        await page.waitForTimeout(400)
        await expect(diags.first()).toBeVisible()
      }
    }

    // Test Reset to Standard Spec
    const resetBtn = page.locator('button.bmr-sandbox__reset')
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()
    await page.waitForTimeout(400)

    // =========================================================================
    // Workflow 2: Product Edit, SERP Live Preview, and Builder Rules Tab
    // =========================================================================
    console.log('[Workflow 2] Testing Product Edit, SERP Preview & Builder Rules Tab...')
    const prodRes = await request.get('/api/products?limit=1&depth=0', { headers: authHeader })
    if (prodRes.ok()) {
      const prodData = await prodRes.json()
      const productId = prodData.docs?.[0]?.id
      if (productId) {
        await page.goto(`/admin/collections/products/${productId}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(800)

        // Verify SERP Preview
        const serpCard = page.locator('.bmr-serp-preview__card')
        await expect(serpCard).toBeVisible({ timeout: 10_000 })

        const serpTitle = page.locator('.bmr-serp-preview__title')
        await expect(serpTitle).toBeVisible()
        const originalTitle = await serpTitle.textContent()

        // Test Keystroke reactivity on title
        const titleInput = page.locator('input#field-title')
        if (await titleInput.isVisible()) {
          await titleInput.fill('Precision Audit Rig 2026')
          await page.waitForTimeout(300)
          await expect(serpTitle).toContainText('Precision Audit Rig 2026')

          if (originalTitle) {
            await titleInput.fill(originalTitle)
            await page.waitForTimeout(300)
          }
        }

        // Verify tabs navigation
        const tabs = page.locator('button[role="tab"], .tabs__tab-button, .bmr-tab')
        const tabCount = await tabs.count()
        for (let i = 0; i < tabCount; i++) {
          const tabText = await tabs.nth(i).textContent()
          if (tabText?.includes('Builder Rules') || tabText?.includes('Builder')) {
            await tabs.nth(i).click()
            await page.waitForTimeout(500)
            break
          }
        }
      }
    }

    // =========================================================================
    // Workflow 3: Attribute Terms Manager in attribute-types view
    // =========================================================================
    console.log('[Workflow 3] Testing Attribute Terms Manager...')
    const attrRes = await request.get('/api/attribute-types?limit=1&depth=0', { headers: authHeader })
    if (attrRes.ok()) {
      const attrData = await attrRes.json()
      const attrId = attrData.docs?.[0]?.id
      if (attrId) {
        await page.goto(`/admin/collections/attribute-types/${attrId}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(800)

        const termsManager = page.locator('.bmr-terms-manager')
        await expect(termsManager).toBeVisible({ timeout: 10_000 })
      }
    }

    // =========================================================================
    // Workflow 4: Admin Theme Skin Switching Reactivity
    // =========================================================================
    console.log('[Workflow 4] Testing Admin Theme Skin Switching...')
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    const html = page.locator('html')
    // Dispatch skin change to light-clean
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('bmr-admin-theme-change', { detail: 'light-clean' }))
    })
    await expect(html).toHaveAttribute('data-admin-theme', 'light-clean')
    await expect(html).toHaveAttribute('data-theme', 'light')

    // Dispatch skin change back to precision-dark
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('bmr-admin-theme-change', { detail: 'precision-dark' }))
    })
    await expect(html).toHaveAttribute('data-admin-theme', 'precision-dark')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    // =========================================================================
    // Workflow 5: Collection List Facet Pills & Metric Cards
    // =========================================================================
    console.log('[Workflow 5] Testing Collection List Facet Pills & Metric Cards...')
    await page.goto('/admin/collections/components', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    const header = page.locator('.bmr-components-header, .bmr-collection-header')
    await expect(header).toBeVisible({ timeout: 10_000 })

    // Verify Add Component drawer button
    const addBtn = page.getByRole('button', { name: 'Add Component' })
    await expect(addBtn).toBeVisible()

    // Verify filter tabs / pills (AM5 platform filter)
    const am5Tab = page.getByRole('tab', { name: /Platform AM5/i })
    if (await am5Tab.isVisible()) {
      await am5Tab.click()
      await page.waitForTimeout(600)
      expect(page.url()).toContain('/admin/collections/components')
    }

    // Fail if any critical uncaught errors occurred across all workflows
    const fatalErrors = consoleErrors.filter(
      (c) =>
        c.text.includes('TypeError') ||
        c.text.includes('ReferenceError') ||
        c.text.includes('Uncaught') ||
        c.text.includes('is not a function'),
    )

    expect(pageErrors, `Page errors encountered: ${JSON.stringify(pageErrors)}`).toEqual([])
    expect(fatalErrors, `Fatal console errors encountered: ${JSON.stringify(fatalErrors)}`).toEqual([])
  })
})

import { expect, test } from '@playwright/test'

/**
 * Entry 23 (#179) - cart drawer: a successful product add-to-cart opens the
 * slide-out drawer (07-ux-plan "success → cart drawer pop with animation"),
 * Escape closes it, and the site-wide drawer renders on non-shop routes.
 */
test.describe('cart drawer', () => {
  test('#179 add to cart opens the drawer; Escape closes it', async ({ page }) => {
    await page.goto('/shop')
    await page.locator('a[href="/shop/cpu"]').click()
    await page.locator('a[href^="/product/"]').first().click()
    await expect(page).toHaveURL(/\/product\//)

    await page.getByRole('button', { name: 'Add to cart' }).click()

    const drawer = page.getByRole('dialog', { name: 'Shopping cart' })
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('Your cart')
    await expect(drawer).toContainText('Subtotal')

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('#179b backdrop click closes the drawer', async ({ page }) => {
    await page.goto('/shop')
    await page.locator('a[href="/shop/cpu"]').click()
    await page.locator('a[href^="/product/"]').first().click()
    await page.getByRole('button', { name: 'Add to cart' }).click()

    const drawer = page.getByRole('dialog', { name: 'Shopping cart' })
    await expect(drawer).toBeVisible()

    await page.locator('.cart-drawer-backdrop').click({ position: { x: 8, y: 8 } })
    await expect(drawer).toBeHidden()
  })

  test('#181 drawer shows the real product title (depth-1 cart query, review F1)', async ({ page }) => {
    await page.goto('/shop')
    await page.locator('a[href="/shop/cpu"]').click()
    await page.locator('a[href^="/product/"]').first().click()
    // URL can commit before the product page swaps in — wait for a
    // product-exclusive signal before reading the h1 (the category page
    // also has one, which is how title first read as "CPU").
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible()
    const title = (await page.locator('h1').first().innerText()).trim()
    expect(title.length).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Add to cart' }).click()

    const drawer = page.getByRole('dialog', { name: 'Shopping cart' })
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('ul li').first()).toContainText(title)
  })

  test('#182 View cart renders the cart contents (context cartID gap, review F2)', async ({ page }) => {
    await page.goto('/shop')
    await page.locator('a[href="/shop/cpu"]').click()
    await page.locator('a[href^="/product/"]').first().click()
    await expect(page).toHaveURL(/\/product\//)
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible()
    const title = (await page.locator('h1').first().innerText()).trim()

    await page.getByRole('button', { name: 'Add to cart' }).click()
    const drawer = page.getByRole('dialog', { name: 'Shopping cart' })
    await expect(drawer).toBeVisible()
    await drawer.getByRole('link', { name: 'View cart' }).click()

    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.locator('main')).toContainText(title)
    await expect(page.locator('main')).not.toContainText('Your cart is empty')
  })
})

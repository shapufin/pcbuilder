import { expect, test } from '@playwright/test'

test.describe('storefront smoke', () => {
  test('homepage renders nav, hero and legal footer', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/BuildMyRig/)
    const banner = page.getByRole('banner')
    await expect(banner.getByRole('link', { name: 'Builder' })).toBeVisible()
    await expect(banner.getByRole('link', { name: 'Cart' })).toBeVisible()
    // Site-wide Shop link must target the landing page, not a seeded slug (regression: /shop/components 404)
    await expect(banner.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop')
    await expect(page.getByRole('link', { name: 'Browse components' })).toHaveAttribute('href', '/shop')
    await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible()
  })

  test('shop landing lists categories; category lists products and opens one', async ({ page }) => {
    await page.goto('/shop')
    await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
    const cpuTile = page.locator('a[href="/shop/cpu"]')
    await expect(cpuTile).toBeVisible()
    await cpuTile.click()
    await expect(page).toHaveURL(/\/shop\/cpu/)
    const productLinks = page.locator('a[href^="/product/"]')
    await expect(productLinks.first()).toBeVisible()
    await productLinks.first().click()
    await expect(page).toHaveURL(/\/product\//)
    await expect(page.getByText(/€\s?\d/).first()).toBeVisible()
  })

  test('builder landing renders', async ({ page }) => {
    await page.goto('/builder')
    await expect(page.getByRole('heading', { level: 1, name: 'Build your perfect rig' })).toBeVisible()
  })
})

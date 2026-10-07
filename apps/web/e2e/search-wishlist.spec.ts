import { expect, test } from '@playwright/test'
import { withClassicChrome } from './helpers'

// Classic chrome: the inline header searchbox is the classic header's; the
// nexus pack replaces it with a ⌘K modal trigger.
test.describe('shop search & wishlist (entry 18)', () => {
  withClassicChrome()


  test('header search finds products; wishlist save/round-trip/remove (#111)', async ({ page }) => {
    await page.goto('/')
    const search = page.getByRole('searchbox', { name: 'Search products' })
    await search.fill('rtx')
    await search.press('Enter')
    await expect(page).toHaveURL(/\/shop\/search\?q=rtx/)
    await expect(page.getByText(/result/)).toBeVisible()
    await expect(page.getByText(/No products match/)).toHaveCount(0)

    await page.locator('a[href^="/product/"]').first().click()
    await expect(page).toHaveURL(/\/product\//)

    const save = page.getByRole('button', { name: 'Save to wishlist' })
    await save.click()
    await expect(page.getByRole('button', { name: 'Saved to wishlist' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Wishlist, 1 item' })).toBeVisible()

    await page.goto('/wishlist')
    await expect(page.getByRole('heading', { level: 1, name: 'Wishlist' })).toBeVisible()
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible()

    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText('Nothing saved yet')).toBeVisible()
  })
})

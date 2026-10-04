import { test, expect } from '@playwright/test'

/**
 * Entry 64 — spec facets on category pages (audit S2 gap). The cpu category
 * seeds 4 products: 2 AM5 (7800X3D/7600X) + 2 LGA1700 (14700K/14600K), so
 * the Socket facet must render both values with count 2 and actually filter.
 */
test('category spec facets: counts render, a value filters the grid, toggle clears', async ({
  page,
}) => {
  await page.goto('/shop/cpu')
  await expect(page.locator('.result-count')).toHaveText('4 products')

  // Facet option carries its per-value count (label + count span).
  const am5 = page.getByRole('link', { name: /^AM5\b/ })
  await expect(am5).toBeVisible()
  await expect(am5).toContainText('2')
  await expect(page.getByRole('link', { name: /^LGA1700\b/ })).toContainText('2')

  await am5.click()
  await expect(page).toHaveURL(/[?&]socket=AM5/)
  await expect(page.locator('.result-count')).toHaveText('2 products')
  await expect(am5).toHaveAttribute('aria-current', 'true')

  // Same link toggles the facet off (the page builds the href both ways).
  await page.getByRole('link', { name: /^AM5\b/ }).click()
  await expect(page).not.toHaveURL(/socket=AM5/)
  await expect(page.locator('.result-count')).toHaveText('4 products')
})

test('an unknown facet value is ignored, not rendered as an empty filter', async ({ page }) => {
  await page.goto('/shop/cpu?socket=NOT_A_SOCKET')
  // No elemMatch clause was added — the full set still renders.
  await expect(page.locator('.result-count')).toHaveText('4 products')
})

test('PDP compatibility list renders attribute values and links to the builder', async ({
  page,
}) => {
  await page.goto('/product/amd-ryzen-7-7800x3d')
  const compat = page.getByRole('region', { name: /compatibility/i })
  await expect(compat).toBeVisible()
  await expect(compat).toContainText('Socket')
  await expect(compat).toContainText('AM5')
  await expect(compat.getByRole('link', { name: /PC Builder/ })).toHaveAttribute(
    'href',
    '/builder',
  )
})

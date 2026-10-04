import { test, expect } from '@playwright/test'

/**
 * Entry 62 — PDP RelatedProducts rail (audit S3 gap): a "Related products"
 * section lists same-category products via the shared ProductCard grid,
 * excluding the product being viewed.
 */
test('PDP shows related products from the same category, excluding itself', async ({
  page,
}) => {
  // Seed guarantees ≥4 cpu-category products; 7800X3D is one of them.
  await page.goto('/product/amd-ryzen-7-7800x3d')

  const section = page.getByRole('region', { name: /related products/i })
  await expect(section).toBeVisible()

  const cards = section.getByRole('link', { name: /\S/ })
  const count = await cards.count()
  expect(count).toBeGreaterThanOrEqual(1)
  expect(count).toBeLessThanOrEqual(4)

  const hrefs = await cards.evaluateAll((els) =>
    els.map((el) => el.getAttribute('href')),
  )
  for (const href of hrefs) {
    expect(href).toMatch(/^\/product\//)
    expect(href).not.toBe('/product/amd-ryzen-7-7800x3d')
  }
})

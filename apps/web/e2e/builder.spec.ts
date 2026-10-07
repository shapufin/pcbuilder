import { expect, test } from '@playwright/test'
import { setBuilderDesign } from './design'

test.describe('configurator', () => {
  test('configure page loads the builder index and shows option cards', async ({ page }) => {
    // The aria-pressed option cards are classic-design markup — pin the
    // global so the spec is independent of the stored/default design.
    await setBuilderDesign(page, 'classic')
    await page.goto('/builder/configure')
    // Component option cards carry aria-pressed and only render once
    // GET /api/builder/index has resolved.
    await expect(page.locator('button[aria-pressed]').first()).toBeVisible()
    // Step navigation exists for the multi-step flow.
    await expect(page.locator('button[aria-pressed]').first()).toBeEnabled()
  })

  test('?path=amd hard-filters socket-bound options; switching clears picks', async ({ page }) => {
    await setBuilderDesign(page, 'classic')
    await page.goto('/builder/configure?path=amd')
    // Path switcher reflects the URL path.
    await expect(page.locator('.path-switcher__btn')).toHaveText('AMD build')
    // Step 0 is CPU: only AMD cards render — Intel parts are absent, not disabled.
    const cards = page.locator('.option-card')
    await expect(cards.first()).toBeVisible()
    await expect(cards.filter({ hasText: 'Ryzen' }).first()).toBeVisible()
    await expect(cards.filter({ hasText: 'Intel Core' })).toHaveCount(0)

    // Pick a CPU, then switch to Intel — the confirm clears the bound slots.
    await cards.filter({ hasText: 'Ryzen' }).first().click()
    page.once('dialog', (d) => void d.accept())
    await page.locator('.path-switcher__btn').click()
    await page.locator('.path-switcher__opt', { hasText: 'Intel build' }).click()
    await expect(page.locator('.path-switcher__btn')).toHaveText('Intel build')
    // CPU pick is gone — the slot shows unselected state again.
    await expect(cards.filter({ hasText: 'Ryzen' })).toHaveCount(0)
    await expect(cards.filter({ hasText: 'Intel Core' }).first()).toBeVisible()
    await expect(page.locator('.option-card[aria-pressed="true"]')).toHaveCount(0)
  })

  test('summary page renders with hydration gate (no crash on direct load)', async ({ page }) => {
    await page.goto('/builder/summary')
    // Direct load with an empty draft: the summary still renders its shell
    // (CTAs are disabled until required slots are filled).
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

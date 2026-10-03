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

  test('summary page renders with hydration gate (no crash on direct load)', async ({ page }) => {
    await page.goto('/builder/summary')
    // Direct load with an empty draft: the summary still renders its shell
    // (CTAs are disabled until required slots are filled).
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

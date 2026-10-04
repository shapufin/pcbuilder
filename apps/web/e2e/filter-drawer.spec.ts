import { expect, test } from '@playwright/test'
import { setBuilderDesign } from './design'

/**
 * Round D mobile FilterDrawer on the classic builder's OptionsFilterBar
 * (rig-studio has no option filters — nothing to pin there). The same
 * controlled filter bar mounts twice: inline (desktop) and inside the sheet.
 */
test.describe('mobile filter drawer (classic builder)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('trigger replaces the inline bar ≤900px; sheet opens with the dialog contract', async ({ page }) => {
    await setBuilderDesign(page, 'classic')
    await page.goto('/builder/configure')

    const trigger = page.locator('.filter-drawer__open')
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(page.locator('.panel-filters')).toBeHidden()

    await trigger.click()
    const dialog = page.locator('#filter-drawer-panel')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('role', 'dialog')
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    // The drawer's own copy of the filter bar lives inside the sheet.
    await expect(dialog.locator('.filter-bar input[type="search"]')).toBeVisible()

    // Live filter: typing narrows the option grid behind the sheet.
    const dialogSearch = dialog.locator('.filter-bar input[type="search"]')
    await dialogSearch.fill('ryzen')
    await expect(page.locator('.panel-filters input[type="search"]')).toHaveValue('ryzen')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('desktop keeps the inline filter bar', () => {
  test('≥900px the trigger stays hidden and the inline bar renders', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await setBuilderDesign(page, 'classic')
    await page.goto('/builder/configure')
    await expect(page.locator('.filter-drawer__open')).toBeHidden()
    await expect(page.locator('.panel-filters .filter-bar')).toBeVisible()
  })
})

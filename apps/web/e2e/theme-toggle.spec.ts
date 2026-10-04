import { test, expect } from '@playwright/test'

/**
 * Entry 60 — visitor theme toggle. The layout ships the admin preset
 * (#theme-vars/#theme-skin, media="all") plus a complete alt preset
 * (#theme-alt, media="not all"); the header toggle flips media attrs and
 * stores 'bmr_theme' in localStorage, and THEME_BOOT_SCRIPT re-applies it
 * before paint on reload.
 */
test.describe('visitor theme toggle', () => {
  test('toggle swaps presets live and persists across reload', async ({ page }) => {
    await page.goto('/')

    const alt = page.locator('#theme-alt')
    const vars = page.locator('#theme-vars')
    await expect(vars).toHaveAttribute('media', 'all')
    await expect(alt).toHaveAttribute('media', 'not all')

    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const defaultBg = await bodyBg()

    const toggle = page.getByRole('button', { name: /switch to .* theme/i })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()

    await expect(alt).toHaveAttribute('media', 'all')
    await expect(vars).toHaveAttribute('media', 'not all')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(await bodyBg()).not.toBe(defaultBg)

    // Boot script applies the stored choice pre-paint — the flipped media
    // attrs are present immediately after reload, before hydration.
    await page.reload()
    await expect(page.locator('#theme-alt')).toHaveAttribute('media', 'all')
    expect(await bodyBg()).not.toBe(defaultBg)

    // Toggle back so the default preset is what subsequent specs see.
    await page.getByRole('button', { name: /switch to .* theme/i }).click()
    await expect(page.locator('#theme-vars')).toHaveAttribute('media', 'all')
    await expect(page.locator('#theme-alt')).toHaveAttribute('media', 'not all')
  })
})

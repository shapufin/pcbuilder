import { expect, test, type Locator, type Page } from '@playwright/test'
import { setBuilderDesign } from './design'

/**
 * Entry-54 P4 smoke: the rig-studio design end to end — design root renders,
 * the swap modal installs real components from the builder index, the deploy
 * pipeline halts on an incomplete build and dispatches a complete one
 * (real draft save + composite cart line). The design is pinned via REST
 * (design.ts) so the spec is independent of stored global state.
 */

/** Open a slot's swap modal and install an option (by text, else first enabled). */
async function install(page: Page, slotName: string, optionText?: string): Promise<void> {
  await page.getByRole('button', { name: `Pick a ${slotName}`, exact: true }).click()
  const dialog = page.getByRole('dialog')
  const options = dialog.locator('.studio-option:not([disabled])')
  await (optionText ? options.filter({ hasText: optionText }).first() : options.first()).click()
  // Single-pick slots auto-close; multi-pick stay open — close explicitly.
  try {
    await dialog.waitFor({ state: 'hidden', timeout: 1500 })
  } catch {
    await dialog.getByRole('button', { name: 'Close' }).click()
  }
}

async function openDeploy(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Deploy rig' }).first().click()
  const deploy = page.getByRole('dialog')
  await expect(deploy.getByRole('heading', { name: 'Deployment Matrix' })).toBeVisible()
  return deploy
}

test.describe('rig-studio design', () => {
  test('studio renders, halts deploy on incomplete build, dispatches a full one', async ({
    page,
  }) => {
    await setBuilderDesign(page, 'rig-studio')
    await page.goto('/builder/configure')

    // Design root + studio chrome (index resolved — the bay only renders
    // once GET /api/builder/index lands).
    await expect(page.locator('.bdesign-rig-studio')).toBeVisible()
    await expect(page.getByText('Architect Studio')).toBeVisible()
    await expect(page.getByLabel('Component bay')).toBeVisible()

    // Pick a CPU through the swap modal: proves index → optionRows → select.
    await install(page, 'CPU')
    await expect(page.locator('.studio-pick').first()).toBeVisible()

    // Deploy on a partial build: stage 1 must fail with blockers, pipeline halts.
    let deploy = await openDeploy(page)
    await expect(deploy.getByText('1. Compatibility matrix')).toBeVisible()
    await deploy.getByRole('button', { name: 'Run deploy' }).click()
    await expect(deploy.locator('.studio-deploy-stage--failed').first()).toBeVisible()
    await expect(deploy.getByRole('button', { name: 'Retry deploy' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(deploy).not.toBeVisible()

    // Fill the remaining required slots (seed sortOrder keeps compatibility
    // — excluded options are disabled, first enabled is always installable).
    await install(page, 'Motherboard')
    await install(page, 'Memory')
    await install(page, 'Graphics Card')
    await install(page, 'Storage')
    await install(page, 'Power Supply', 'RM1000x')
    await install(page, 'Case')
    await install(page, 'CPU Cooling')

    // Full deploy: 4 real stages — validation, power, draft save, cart line.
    deploy = await openDeploy(page)
    await deploy.getByRole('button', { name: 'Run deploy' }).click()
    await expect(deploy.locator('.studio-deploy-stage--passed')).toHaveCount(4, {
      timeout: 20_000,
    })
    await expect(deploy.getByRole('button', { name: /cart updated/i })).toBeVisible()
    await page.keyboard.press('Escape')

    // Saved-builds modal opens from the header tab (title: Rig Build Manager).
    await page.getByRole('button', { name: 'Saved builds' }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Rig Build Manager' }),
    ).toBeVisible()
  })
})

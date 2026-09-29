import { expect, test } from '@playwright/test'

/**
 * Entry-15 auth surface, end to end: proxy guard redirect, register (the
 * suite performs exactly ONE registration per run — the register limiter is
 * 5/min/IP), auto-login, account page, logout, failed login, re-login.
 */
test('guard → register → account → logout → bad login → login', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  const password = 'Password123!'

  // 1. Anonymous /account bounces to the login form with a safe ?next.
  await page.goto('/account')
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Faccount$/)

  // 2. Register — zod-valid form, auto-login, lands on /account.
  await page.goto('/auth/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('**/account')
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.locator('a[href="/account"]').first()).toBeVisible()

  // 3. Logout clears the session; header falls back to Sign in.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/account'))
  await expect(page.locator('a[href="/auth/login"]').first()).toBeVisible()

  // 4. Guard catches us again now that the cookie is gone.
  await page.goto('/account')
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Faccount$/)

  // 5. Wrong password → inline alert, no session.
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('definitely-wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Scope to the form's <p role="alert"> — Next's route announcer also uses
  // role="alert", which would make the unscoped query a strict-mode violation.
  await expect(page.locator('main p[role="alert"]')).toHaveText(/Invalid email or password/)

  // 6. Correct password → /account (the ?next survived the failed attempt).
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/account')
  await expect(page.getByText(email)).toBeVisible()
})

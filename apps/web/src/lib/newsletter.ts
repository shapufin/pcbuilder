/**
 * Newsletter double opt-in (audit 2026-11-18 M3). Deps are injected (contact.ts
 * pattern) so the flow is unit-testable without Payload.
 *
 * - Subscribers persist in the `newsletter-subscribers` collection.
 * - A submit only ever mails the submitted address, and at most once per
 *   COOLDOWN_MS — the form can no longer be used to flood a stranger.
 * - Confirmed addresses never receive another confirmation mail.
 * - The confirm token is single-use.
 */

import { newsletterConfirmHtml } from '@buildmyrig/plugin-shop/emails'

export const COOLDOWN_MS = 15 * 60_000

export type SubscriberRow = {
  email: string
  status: 'pending' | 'confirmed'
  confirmToken: string | null
  lastSentAt: string | null
  confirmedAt?: string | null
}

export type NewsletterDeps = {
  now: () => Date
  newToken: () => string
  baseUrl: string
  findByEmail: (email: string) => Promise<SubscriberRow | null>
  findByToken: (token: string) => Promise<SubscriberRow | null>
  save: (row: SubscriberRow) => Promise<void>
  sendEmail: (args: { to: string; subject: string; html: string }) => Promise<{ sent?: boolean } | undefined>
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase()

export const subscribeToNewsletter = async (
  deps: NewsletterDeps,
  rawEmail: string,
): Promise<{ ok: true; emailed: boolean; dryRun?: boolean }> => {
  const email = normalizeEmail(rawEmail)
  const existing = await deps.findByEmail(email)
  if (existing?.status === 'confirmed') return { ok: true, emailed: false }

  const now = deps.now()
  const last = existing?.lastSentAt ? Date.parse(existing.lastSentAt) : NaN
  if (Number.isFinite(last) && now.getTime() - last < COOLDOWN_MS) return { ok: true, emailed: false }

  const token = deps.newToken()
  await deps.save({ email, status: 'pending', confirmToken: token, lastSentAt: now.toISOString() })
  const url = `${deps.baseUrl.replace(/\/+$/, '')}/api/newsletter/confirm?token=${encodeURIComponent(token)}`
  const result = await deps.sendEmail({
    to: email,
    subject: 'Confirm your BuildMyRig subscription',
    html: newsletterConfirmHtml(url),
  })
  return result?.sent === false ? { ok: true, emailed: false, dryRun: true } : { ok: true, emailed: true }
}

export const confirmNewsletter = async (
  deps: Pick<NewsletterDeps, 'findByToken' | 'save' | 'now'>,
  token: string,
): Promise<'confirmed' | 'invalid'> => {
  if (!token) return 'invalid'
  const row = await deps.findByToken(token)
  if (!row || row.status !== 'pending') return 'invalid'
  await deps.save({ ...row, status: 'confirmed', confirmToken: null, confirmedAt: deps.now().toISOString() })
  return 'confirmed'
}

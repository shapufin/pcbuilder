/**
 * Mailer relocated to `@buildmyrig/lib/server` (entry 121) — it is generic
 * infra, not shop logic; kept as a re-export so `emails/order-emails.ts`,
 * `emails/low-stock.ts` and the `plugin-shop/emails` surface stay unchanged.
 */
export { sendResendEmail, type EmailLogger, type EmailResult } from '@buildmyrig/lib/server'

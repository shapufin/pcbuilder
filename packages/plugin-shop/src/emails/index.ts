/**
 * Shared transactional-email surface for the app (entry 23): the Resend
 * sender (dry-run without RESEND_API_KEY/EMAIL_FROM) plus the order
 * templates. Subpath export so apps/web doesn't pull the whole plugin
 * (collections, Stripe adapter) just to send one email.
 */
export { sendResendEmail, type EmailLogger, type EmailResult } from './resend.ts'
export {
  contactFormHtml,
  escapeHtml,
  formatEur,
  lowStockAlertHtml,
  newsletterWelcomeHtml,
  orderConfirmationHtml,
  orderShippedHtml,
} from './templates.ts'
export type {
  ContactFormInput,
  LowStockInput,
  LowStockRow,
  OrderEmailInput,
  OrderEmailLine,
} from './templates.ts'

import { sendResendEmail } from '@buildmyrig/plugin-shop/emails'
import { contactLimiter, handleContactSubmission } from '@/lib/contact'

const logger = {
  info: (message: string) => console.info(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
}

/**
 * POST /api/contact — storefront contact form → staff inbox (entry 23,
 * 07-ux-plan.md). Thin route: gates + send live in lib/contact.ts; the shared
 * sender dry-runs without RESEND_API_KEY/EMAIL_FROM.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  return handleContactSubmission(
    { sendEmail: (args) => sendResendEmail(args, logger), limiter: contactLimiter },
    { body, headers: req.headers },
  )
}

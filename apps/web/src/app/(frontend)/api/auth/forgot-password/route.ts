import { sendResendEmail } from '@buildmyrig/plugin-shop/emails'
import { getPayloadClient } from '@/lib/shop'
import { forgotPasswordLimiter, requestPasswordReset } from '@/lib/password-reset'

/**
 * POST /api/auth/forgot-password — public, always 200 {ok:true} (entry 23,
 * anti-enumeration: identical answer whether or not the account exists).
 * payload.forgotPassword runs with disableEmail: true — it returns the token
 * (or null for unknown emails) and we send through the shared Resend sender,
 * which dry-runs without RESEND_API_KEY/EMAIL_FROM. disableEmail bypasses
 * payload's per-user minRequestInterval, so the IP limiter (5/min) is the
 * throttle (see password-reset.ts).
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const payload = await getPayloadClient()
  return requestPasswordReset(
    {
      forgotPassword: async ({ email }) => {
        const token = await payload.forgotPassword({
          collection: 'users',
          data: { email },
          disableEmail: true,
        })
        return (token as string | null) ?? null
      },
      sendEmail: ({ to, subject, html }) => sendResendEmail({ to, subject, html }, payload.logger),
      limiter: forgotPasswordLimiter,
    },
    { body, headers: req.headers },
  )
}

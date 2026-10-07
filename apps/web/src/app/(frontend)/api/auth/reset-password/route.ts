import { generatePayloadCookie } from 'payload/shared'
import { getPayloadClient } from '@/lib/shop'
import { completePasswordReset, resetPasswordLimiter } from '@/lib/password-reset'

/**
 * POST /api/auth/reset-password — completes the entry-23 flow. payload owns
 * the token contract (single-use, 1 h expiry; reset also revokes every other
 * session and clears a maxLoginAttempts lockout). On success we mint the
 * session cookie ourselves (the local API does not set one — only payload's
 * REST handler does) so the user lands signed in.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const payload = await getPayloadClient()
  return completePasswordReset(
    {
      resetPassword: ({ token, password }) =>
        payload.resetPassword({
          collection: 'users',
          data: { token, password },
          overrideAccess: true,
        }),
      makeCookie: (token) =>
        generatePayloadCookie({
          collectionAuthConfig: payload.collections.users.config.auth,
          cookiePrefix: payload.config.cookiePrefix,
          token,
        }),
      limiter: resetPasswordLimiter,
    },
    { body, headers: req.headers },
  )
}

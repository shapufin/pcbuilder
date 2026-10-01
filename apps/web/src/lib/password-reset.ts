import { z } from 'zod'
import { rateLimit } from '@buildmyrig/lib'
import { escapeHtml } from '@buildmyrig/plugin-shop/emails'
import { clientIp, isAllowedOrigin } from './auth'

/**
 * Storefront password reset (entry 23): payload's local API owns tokens
 * (40-hex, 1 h expiry, single-use, session revocation on reset) — this module
 * only gates the two endpoints and sends the email through the shared Resend
 * sender (dry-run without API keys, so dev/CI stay side-effect free).
 *
 * Anti-enumeration contract (#158/#158b): forgot ALWAYS answers 200 {ok:true}
 * with an identical body whether or not the account exists; payload's own
 * REST endpoint behaves the same. `disableEmail: true` bypasses payload's
 * per-user minRequestInterval, so our own IP limiter (5/min) is the throttle.
 */

export type ForgotPasswordDeps = {
  forgotPassword: (args: { email: string }) => Promise<string | null>
  sendEmail: (args: { to: string; subject: string; html: string }) => Promise<unknown>
  limiter: { check: (key: string) => { ok: boolean; retryAfterMs: number } }
}

export type ResetPasswordDeps = {
  resetPassword: (args: {
    token: string
    password: string
  }) => Promise<{ token?: string }>
  makeCookie?: (jwt: string) => string
  limiter: { check: (key: string) => { ok: boolean; retryAfterMs: number } }
}

export const forgotPasswordSchema = z.object({ email: z.string().trim().email() })

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
})

/** 5 forgot/reset requests/min/IP — brute-force + reset-mail flooding (11-access-security.md). */
export const forgotPasswordLimiter = rateLimit({ windowMs: 60_000, max: 5 })
export const resetPasswordLimiter = rateLimit({ windowMs: 60_000, max: 5 })

const defaultAllowedOrigins = (): string[] => {
  const list = ['http://localhost:3000', 'http://127.0.0.1:3000']
  const base = (process.env.BMR_URL ?? '').replace(/\/+$/, '')
  if (base) list.push(base)
  return list
}

export const passwordResetLink = (token: string): string => {
  const base = (process.env.BMR_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  return `${base}/auth/reset?token=${encodeURIComponent(token)}`
}

export const passwordResetHtml = (link: string): string => {
  const safe = escapeHtml(link)
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:24px">
      <h1 style="margin:0 0 16px;font-size:20px">Reset your password</h1>
      <p style="margin:8px 0">We received a request to reset your BuildMyRig password. This link expires in 1 hour and can be used once.</p>
      <p style="margin:16px 0"><a href="${safe}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#4f46e5;color:#ffffff;font-weight:700;text-decoration:none">Set a new password</a></p>
      <p style="margin:8px 0;font-size:12px;color:#71717a">If you didn't request this you can ignore this email — your password stays unchanged.</p>
      <p style="margin-top:24px;font-size:12px;color:#71717a">BuildMyRig — custom PCs, built to order.</p>
    </div>
  </body>
</html>`
}

export const requestPasswordReset = async (
  deps: ForgotPasswordDeps,
  input: { body: unknown; headers?: Headers },
): Promise<Response> => {
  const headers = input.headers ?? new Headers()

  if (!isAllowedOrigin(headers.get('origin'), defaultAllowedOrigins())) {
    return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  }

  const rate = deps.limiter.check(clientIp(headers))
  if (!rate.ok) {
    return Response.json(
      { error: 'Too many attempts, try again shortly' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const parsed = forgotPasswordSchema.safeParse(input.body)
  if (!parsed.success) {
    return Response.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const generic = Response.json({ ok: true }, { status: 200 })
  try {
    const token = await deps.forgotPassword({ email: parsed.data.email })
    if (!token) return generic
    const link = passwordResetLink(token)
    const result = (await deps.sendEmail({
      to: parsed.data.email,
      subject: 'Reset your BuildMyRig password',
      html: passwordResetHtml(link),
    })) as { sent?: boolean } | undefined
    // Dry-run (no RESEND_API_KEY/EMAIL_FROM): surface the link in the server
    // log so dev probes can complete the flow without a real inbox. Production
    // logs must never carry a live token (#180 — log access would equal
    // account takeover while the keys stay owner-blocked).
    if (result && result.sent === false) {
      if (process.env.NODE_ENV === 'production') {
        console.info(
          `[password-reset] dry-run for ${parsed.data.email} — reset link not logged in production; set RESEND_API_KEY + EMAIL_FROM to deliver it`,
        )
      } else {
        console.info(`[password-reset] dry-run reset link for ${parsed.data.email}: ${link}`)
      }
    }
    return generic
  } catch (e) {
    // Same anti-enumeration answer on send/DB failure — a 5xx here would
    // only ever fire for accounts that exist.
    console.error('[password-reset] forgot failed:', e instanceof Error ? e.message : e)
    return generic
  }
}

export const completePasswordReset = async (
  deps: ResetPasswordDeps,
  input: { body: unknown; headers?: Headers },
): Promise<Response> => {
  const headers = input.headers ?? new Headers()

  if (!isAllowedOrigin(headers.get('origin'), defaultAllowedOrigins())) {
    return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  }

  const rate = deps.limiter.check(clientIp(headers))
  if (!rate.ok) {
    return Response.json(
      { error: 'Too many attempts, try again shortly' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const parsed = resetPasswordSchema.safeParse(input.body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Password must be at least 8 characters and the link must be complete' },
      { status: 400 },
    )
  }

  try {
    const result = await deps.resetPassword(parsed.data)
    const cookie = result.token && deps.makeCookie ? deps.makeCookie(result.token) : null
    return Response.json(
      { ok: true },
      { status: 200, headers: cookie ? { 'Set-Cookie': cookie } : undefined },
    )
  } catch (e) {
    const err = e as { status?: number; message?: string; name?: string }
    if (err.status === 403 || /invalid or has expired/i.test(err.message ?? '')) {
      return Response.json(
        { error: 'This reset link is invalid or has expired — request a new one' },
        { status: 403 },
      )
    }
    console.error('[password-reset] reset failed:', err.name, err.message)
    return Response.json({ error: 'Password reset failed' }, { status: 500 })
  }
}

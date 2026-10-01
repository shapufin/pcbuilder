import { describe, expect, it, vi } from 'vitest'
import {
  completePasswordReset,
  passwordResetHtml,
  passwordResetLink,
  requestPasswordReset,
  type ForgotPasswordDeps,
  type ResetPasswordDeps,
} from './password-reset.ts'

/**
 * Entry 23: storefront password reset. #158–#163 drive both handlers with
 * injected deps (no payload import, no DB) — same pattern as auth.test.ts.
 * Anti-enumeration contract: forgot always answers 200 with an identical
 * body whether or not the account exists (payload's own endpoint does the
 * same); the reset link is only emailed when payload returned a token.
 */

const okLimiter = { check: vi.fn(() => ({ ok: true, retryAfterMs: 0 })) }

const makeForgotDeps = (
  overrides: Partial<ForgotPasswordDeps> = {},
): ForgotPasswordDeps => ({
  forgotPassword: vi.fn(async () => 'tok-abc123'),
  sendEmail: vi.fn(async () => ({ sent: true, id: 'email_1' })),
  limiter: okLimiter,
  ...overrides,
})

const makeResetDeps = (overrides: Partial<ResetPasswordDeps> = {}): ResetPasswordDeps => ({
  resetPassword: vi.fn(async () => ({ token: 'jwt-value' })),
  limiter: okLimiter,
  ...overrides,
})

const forgot = (
  deps: ForgotPasswordDeps,
  input: { body?: unknown; headers?: Headers } = {},
): Promise<Response> =>
  requestPasswordReset(deps, {
    body: 'body' in input ? input.body : { email: 'user@example.com' },
    headers: input.headers ?? new Headers(),
  })

const reset = (
  deps: ResetPasswordDeps,
  input: { body?: unknown; headers?: Headers } = {},
): Promise<Response> =>
  completePasswordReset(deps, {
    body: 'body' in input ? input.body : { token: 'tok-abc123', password: 'supersecret1' },
    headers: input.headers ?? new Headers(),
  })

describe('requestPasswordReset — entry 23 (forgot password)', () => {
  it('#158 known account: 200 + reset email with the link payload handed us', async () => {
    const deps = makeForgotDeps()
    const res = await forgot(deps)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(deps.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' })
    expect(deps.sendEmail).toHaveBeenCalledTimes(1)
    const call = (deps.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      to: string
      subject: string
      html: string
    }
    expect(call.to).toBe('user@example.com')
    expect(call.subject).toMatch(/reset/i)
    expect(call.html).toContain('/auth/reset?token=tok-abc123')
  })

  it('#158b unknown account: byte-identical 200, no email sent (no enumeration)', async () => {
    const known = await forgot(makeForgotDeps())
    const unknownDeps = makeForgotDeps({ forgotPassword: vi.fn(async () => null) })
    const unknown = await forgot(unknownDeps)
    expect(unknown.status).toBe(200)
    expect(await unknown.json()).toEqual(await known.json())
    expect(unknownDeps.sendEmail).not.toHaveBeenCalled()
    expect(unknownDeps.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' })
  })

  it('#159 rejects disallowed Origin (403), rate-limits the 6th try (429 + Retry-After), bad email (400)', async () => {
    const cross = await forgot(makeForgotDeps(), {
      headers: new Headers({ origin: 'https://evil.example' }),
    })
    expect(cross.status).toBe(403)

    let allowed = 5
    const limiter = {
      check: vi.fn(() =>
        allowed > 0
          ? (allowed--, { ok: true, retryAfterMs: 0 })
          : { ok: false, retryAfterMs: 30_000 },
      ),
    }
    const deps = makeForgotDeps({ limiter })
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) statuses.push((await forgot(deps)).status)
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
    expect(deps.forgotPassword).toHaveBeenCalledTimes(5)
    const last = await forgot(deps)
    expect(last.headers.get('retry-after')).toBe('30')

    const bad = await forgot(makeForgotDeps(), { body: { email: 'not-an-email' } })
    expect(bad.status).toBe(400)
    const empty = await forgot(makeForgotDeps(), { body: null })
    expect(empty.status).toBe(400)
  })

  it('#160 send failure still returns 200 (logs, never leaks existence via 5xx)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = makeForgotDeps({
      sendEmail: vi.fn(async () => {
        throw new Error('resend 500: internal')
      }),
    })
    const res = await forgot(deps)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()

    const crash = makeForgotDeps({
      forgotPassword: vi.fn(async () => {
        throw new Error('db down')
      }),
    })
    const res2 = await forgot(crash)
    expect(res2.status).toBe(200)
    expect(await res2.json()).toEqual({ ok: true })
  })

  it('#163 dry-run (no API key): logs the reset link so dev/probe can complete the flow', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const deps = makeForgotDeps({
      sendEmail: vi.fn(async () => ({ sent: false, dryRun: true })),
    })
    const res = await forgot(deps)
    expect(res.status).toBe(200)
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('/auth/reset?token=tok-abc123'))
    infoSpy.mockRestore()
  })

  it('#180 production dry-run log redacts the reset token (log-disclosure guard)', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const deps = makeForgotDeps({
      sendEmail: vi.fn(async () => ({ sent: false, dryRun: true })),
    })
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const res = await forgot(deps)
      expect(res.status).toBe(200)
      expect(infoSpy).toHaveBeenCalled()
      const logged = infoSpy.mock.calls.map((c) => String(c[0])).join('\n')
      expect(logged).toContain('user@example.com')
      expect(logged).not.toContain('tok-abc123')
      expect(logged).not.toContain('/auth/reset')
    } finally {
      vi.unstubAllEnvs()
      infoSpy.mockRestore()
    }
  })
})

describe('completePasswordReset — entry 23 (reset password)', () => {
  it('#161 valid token: 200 + Set-Cookie from the JWT payload returned', async () => {
    const deps = makeResetDeps({
      makeCookie: (token) => `payload-token=${token}; HttpOnly; Path=/; SameSite=Lax`,
    })
    const res = await reset(deps)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(deps.resetPassword).toHaveBeenCalledWith({ token: 'tok-abc123', password: 'supersecret1' })
    expect(res.headers.get('set-cookie')).toContain('payload-token=jwt-value')
  })

  it('#161b works without makeCookie (no session cookie header)', async () => {
    const res = await reset(makeResetDeps())
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('#162 invalid/expired token (payload 403) -> 403 friendly error, no cookie', async () => {
    const deps = makeResetDeps({
      resetPassword: vi.fn(async () => {
        const err = new Error('Token is either invalid or has expired.') as Error & {
          status?: number
        }
        err.status = 403
        throw err
      }),
      makeCookie: vi.fn(() => 'payload-token=x'),
    })
    const res = await reset(deps)
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/invalid or.*expired/i)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('#162b unexpected failure -> generic 500, no internals leaked', async () => {
    const deps = makeResetDeps({
      resetPassword: vi.fn(async () => {
        throw new Error('SQLITE: table users at internal_xyz')
      }),
    })
    const res = await reset(deps)
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).not.toMatch(/SQLITE|internal_xyz|table/)
  })

  it('#162c origin (403), rate limit (429), weak password / missing token (400)', async () => {
    const cross = await reset(makeResetDeps(), {
      headers: new Headers({ origin: 'https://evil.example' }),
    })
    expect(cross.status).toBe(403)

    let allowed = 5
    const limiter = {
      check: vi.fn(() =>
        allowed > 0
          ? (allowed--, { ok: true, retryAfterMs: 0 })
          : { ok: false, retryAfterMs: 45_000 },
      ),
    }
    const deps = makeResetDeps({ limiter })
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) statuses.push((await reset(deps)).status)
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
    expect(deps.resetPassword).toHaveBeenCalledTimes(5)

    for (const body of [
      { token: 'tok-abc123', password: 'short' },
      { password: 'supersecret1' },
      { token: 'tok-abc123' },
      null,
    ]) {
      const res = await reset(makeResetDeps(), { body })
      expect(res.status).toBe(400)
    }
  })
})

describe('reset link + email template — entry 23', () => {
  it('#163b link uses BMR_URL with trailing slashes stripped, token URL-encoded', () => {
    const prev = process.env.BMR_URL
    process.env.BMR_URL = 'https://shop.example.com///'
    expect(passwordResetLink('tok/1')).toBe(
      'https://shop.example.com/auth/reset?token=tok%2F1',
    )
    delete process.env.BMR_URL
    expect(passwordResetLink('abc')).toBe('http://localhost:3000/auth/reset?token=abc')
    if (prev === undefined) delete process.env.BMR_URL
    else process.env.BMR_URL = prev
  })

  it('#163c template escapes the href (a crafted link cannot inject HTML)', () => {
    // Direct call: passwordResetLink already URL-encodes the token, so the
    // template must also survive a raw unencoded link (defense in depth).
    const html = passwordResetHtml(
      'http://localhost:3000/auth/reset?token=x"><script>alert(1)</script>',
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;')
    expect(html).toContain('/auth/reset?token=')
    expect(html).toMatch(/expires/i)
  })
})

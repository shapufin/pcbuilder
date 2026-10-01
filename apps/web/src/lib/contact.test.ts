import { afterEach, describe, expect, it, vi } from 'vitest'
import { contactLimiter, handleContactSubmission, type ContactDeps } from './contact.ts'

/**
 * Entry 23 (07-ux-plan.md: /contact form → Resend): storefront contact
 * endpoint with the same gate stack as auth endpoints (origin → IP limiter
 * → zod) and the shared Resend sender's dry-run contract. Deps injected —
 * no payload import (auth.test.ts / password-reset.test.ts pattern).
 */

const okLimiter = { check: vi.fn(() => ({ ok: true, retryAfterMs: 0 })) }

const makeDeps = (overrides: Partial<ContactDeps> = {}): ContactDeps => ({
  sendEmail: vi.fn(async () => ({ sent: true, id: 'email_1' })),
  limiter: okLimiter,
  ...overrides,
})

const validBody = {
  name: 'Ana Reyes',
  email: 'ana@example.com',
  message: 'Hello, I would like a quote for a quiet 4K editing build.',
}

const submit = (
  deps: ContactDeps,
  input: { body?: unknown; headers?: Headers } = {},
): Promise<Response> =>
  handleContactSubmission(deps, {
    body: 'body' in input ? input.body : validBody,
    headers: input.headers ?? new Headers(),
  })

describe('handleContactSubmission — entry 23 gates', () => {
  it('#173 disallowed origin → 403, rate limit → 429, invalid payload → 400', async () => {
    const deps = makeDeps()
    const evil = await submit(deps, {
      headers: new Headers({ origin: 'https://evil.example' }),
    })
    expect(evil.status).toBe(403)

    const limited = makeDeps({
      limiter: { check: vi.fn(() => ({ ok: false, retryAfterMs: 30_000 })) },
    })
    const limitedRes = await submit(limited)
    expect(limitedRes.status).toBe(429)
    expect(limitedRes.headers.get('Retry-After')).toBe('30')

    const short = await submit(deps, {
      body: { name: 'A', email: 'not-an-email', message: 'x' },
    })
    expect(short.status).toBe(400)
    const missing = await submit(deps, { body: null })
    expect(missing.status).toBe(400)
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })
})

describe('handleContactSubmission — entry 23 send paths', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('#174 dry-run result, success, send failure → 502, no recipient env → dry-run without send', async () => {
    vi.stubEnv('STAFF_ALERT_EMAIL', 'team@buildmyrig.test')

    // Sender dry-run (no RESEND keys) passes through as {ok,dryRun}.
    const dry = makeDeps({ sendEmail: vi.fn(async () => ({ sent: false, dryRun: true })) })
    const dryRes = await submit(dry)
    expect(dryRes.status).toBe(200)
    expect(await dryRes.json()).toEqual({ ok: true, dryRun: true })

    // Success: plain {ok:true}; subject is single-line even for newline input.
    const ok = makeDeps()
    const okRes = await submit(ok, { body: { ...validBody, name: 'Jane\nDoe' } })
    expect(okRes.status).toBe(200)
    expect(await okRes.json()).toEqual({ ok: true })
    const call = (ok.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      to: string
      subject: string
      html: string
    }
    expect(call.to).toBe('team@buildmyrig.test')
    expect(call.subject).toBe('New contact message from Jane Doe')
    expect(call.subject).not.toContain('\n')
    expect(call.html).toContain('Jane')

    // Send failure → 502 with a generic error.
    const fail = makeDeps({ sendEmail: vi.fn(async () => Promise.reject(new Error('resend down'))) })
    const failRes = await submit(fail)
    expect(failRes.status).toBe(502)
    expect((await failRes.json()).error).toBeTruthy()

    // No recipient configured → dry-run answer without even calling the sender.
    vi.stubEnv('STAFF_ALERT_EMAIL', '')
    vi.stubEnv('EMAIL_FROM', '')
    const noEnv = makeDeps()
    const noEnvRes = await submit(noEnv)
    expect(noEnvRes.status).toBe(200)
    expect(await noEnvRes.json()).toEqual({ ok: true, dryRun: true })
    expect(noEnv.sendEmail).not.toHaveBeenCalled()
  })

  it('#174b contact limiter: 5 submissions per minute per IP', () => {
    for (let i = 0; i < 5; i++) {
      expect(contactLimiter.check('203.0.113.9').ok).toBe(true)
    }
    expect(contactLimiter.check('203.0.113.9').ok).toBe(false)
    expect(contactLimiter.check('203.0.113.10').ok).toBe(true)
  })
})

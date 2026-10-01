import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route.ts'

/**
 * Entry 23: the newsletter route's inline Resend fetch moves to the shared
 * sender + newsletterWelcomeHtml template — the response contract must not
 * change: no keys → {ok:true,dryRun:true}, success → {ok:true}, send failure
 * → 502. Distinct X-Forwarded-For per call (shared 5/min limiter).
 */

const makeReq = (email: string, ip: string): Parameters<typeof POST>[0] =>
  new Request('http://localhost:3000/api/newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  }) as Parameters<typeof POST>[0]

describe('newsletter route (entry 23 — shared sender refactor)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'e1' }) })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('#175 response contract preserved: dry-run / ok / 502', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', '')
    const dry = await POST(makeReq('a@example.com', '10.9.1.1'))
    expect(dry.status).toBe(200)
    expect(await dry.json()).toEqual({ ok: true, dryRun: true })
    expect(fetchMock).not.toHaveBeenCalled()

    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'news@buildmyrig.test')
    const ok = await POST(makeReq('b@example.com', '10.9.1.2'))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.to).toEqual(['b@example.com'])
    expect(body.subject).toContain('Welcome')
    expect(body.html).toContain('Thanks for subscribing')

    fetchMock.mockRejectedValueOnce(new Error('resend down'))
    const fail = await POST(makeReq('c@example.com', '10.9.1.3'))
    expect(fail.status).toBe(502)
    expect((await fail.json()).error).toBeTruthy()
  })
})

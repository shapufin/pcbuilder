import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubscriberRow } from '@/lib/newsletter'

/**
 * Newsletter route contract (entry 23, reworked by audit 2026-11-18 M3 to
 * double opt-in): no keys → {ok:true,dryRun:true}; a sent confirmation →
 * {ok:true}; send failure → 502. Persistence is mocked at the Payload seam
 * (newsletter.server). Distinct X-Forwarded-For per call (5/min limiter).
 */
const store: SubscriberRow[] = []
vi.mock('@/lib/newsletter.server', () => ({
  newsletterDeps: async (extra: Record<string, unknown>) => ({
    ...extra,
    now: () => new Date(),
    baseUrl: 'http://localhost:3000',
    findByEmail: async (email: string) => store.find((r) => r.email === email) ?? null,
    findByToken: async (token: string) => store.find((r) => r.confirmToken === token) ?? null,
    save: async (row: SubscriberRow) => {
      const i = store.findIndex((r) => r.email === row.email)
      if (i >= 0) store[i] = row
      else store.push(row)
    },
  }),
}))

const { POST } = await import('./route.ts')

const makeReq = (email: string, ip: string): Parameters<typeof POST>[0] =>
  new Request('http://localhost:3000/api/newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  }) as Parameters<typeof POST>[0]

describe('newsletter route', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    store.length = 0
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
    expect(body.subject).toContain('Confirm')
    expect(body.html).toContain('/api/newsletter/confirm?token=')

    fetchMock.mockRejectedValueOnce(new Error('resend down'))
    const fail = await POST(makeReq('c@example.com', '10.9.1.3'))
    expect(fail.status).toBe(502)
    expect((await fail.json()).error).toBeTruthy()
  })

  it('#747 the same address submitted repeatedly is mailed once and stored once (audit 2026-11-18 M3)', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'news@buildmyrig.test')
    for (let i = 0; i < 4; i++) {
      const res = await POST(makeReq('victim@example.com', `10.9.2.${i}`))
      expect(res.status).toBe(200)
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.filter((r) => r.email === 'victim@example.com')).toHaveLength(1)
    expect(store[0]!.status).toBe('pending')
  })
})

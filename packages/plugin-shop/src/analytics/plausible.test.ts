import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendPlausibleEvent } from './plausible.ts'

/**
 * Entry 23 (12-integrations-ops.md): server-side Plausible purchase event —
 * the client-side track('Purchase') in checkout only fires in a browser with
 * the Plausible script; settlement must record revenue server-side too.
 * Contract mirrors sendResendEmail: no NEXT_PUBLIC_PLAUSIBLE_DOMAIN →
 * logged dry-run, no network (dev/CI stay side-effect free).
 */

const makeLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const event = () => ({
  name: 'purchase',
  url: 'https://shop.example.com/checkout',
  props: { order_id: '7' },
  revenue: { currency: 'EUR', amount: 1299.5 },
})

describe('sendPlausibleEvent (entry 23 — server purchase event)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) })
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'shop.example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('#164 no NEXT_PUBLIC_PLAUSIBLE_DOMAIN → logged dry-run, no network call', async () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', '')
    const logger = makeLogger()
    const result = await sendPlausibleEvent(event(), logger)
    expect(result).toEqual({ sent: false, dryRun: true })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('dry-run'))
  })

  it('#165 posts the documented event body (name/domain/url/props/revenue) to plausible.io', async () => {
    const logger = makeLogger()
    const result = await sendPlausibleEvent(event(), logger)
    expect(result).toEqual({ sent: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://plausible.io/api/event')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init.signal).toBeDefined()
    const body = JSON.parse(String(init.body))
    expect(body.name).toBe('purchase')
    expect(body.domain).toBe('shop.example.com')
    expect(body.url).toBe('https://shop.example.com/checkout')
    expect(body.props).toEqual({ order_id: '7' })
    expect(body.revenue).toEqual({ currency: 'EUR', amount: 1299.5 })
  })

  it('#166 non-2xx and network failures log + throw (never silently swallowed)', async () => {
    const logger = makeLogger()
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' })
    await expect(sendPlausibleEvent(event(), logger)).rejects.toThrow(/plausible 400/)
    expect(logger.error).toHaveBeenCalledTimes(1)

    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(sendPlausibleEvent(event(), logger)).rejects.toThrow('ECONNREFUSED')
    expect(logger.error).toHaveBeenCalledTimes(2)
  })
})

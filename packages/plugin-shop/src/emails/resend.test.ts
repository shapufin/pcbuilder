import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendResendEmail } from './resend.ts'

/**
 * Entry 20 (Phase 5 Step B): transactional sender for order emails
 * (12-integrations-ops.md "Email - Resend"). Mirrors the newsletter route's
 * contract: without RESEND_API_KEY + EMAIL_FROM → dry-run log, no network.
 */
describe('sendResendEmail (entry 20)', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    logger.info.mockReset()
    logger.warn.mockReset()
    logger.error.mockReset()
    // Never trust the ambient machine env (#118 review fix).
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('#118 no credentials → dry-run log, no network call', async () => {
    const result = await sendResendEmail(
      { to: 'buyer@example.com', subject: 'Order #7 confirmed', html: '<p>hi</p>' },
      logger,
    )
    expect(result).toEqual({ sent: false, dryRun: true })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('dry-run'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('buyer@example.com'))

    // Partial credentials (one of two set) are still a dry-run.
    vi.stubEnv('EMAIL_FROM', 'orders@buildmyrig.test')
    const partial = await sendResendEmail(
      { to: 'buyer@example.com', subject: 's', html: '<p>x</p>' },
      logger,
    )
    expect(partial).toEqual({ sent: false, dryRun: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('#119 credentials set → POSTs to Resend with auth + payload, returns id', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('EMAIL_FROM', 'orders@buildmyrig.test')
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'email_123' }) })

    const result = await sendResendEmail(
      { to: 'buyer@example.com', subject: 'Order #7 confirmed', html: '<p>hi</p>' },
      logger,
    )
    expect(result).toEqual({ sent: true, id: 'email_123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer re_test_key')
    // Bounded wait: the hook runs on the payment-settlement critical path
    // (review finding #2) — a hung connection must not stall the webhook.
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.signal.aborted).toBe(false)
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      from: 'orders@buildmyrig.test',
      to: ['buyer@example.com'],
      subject: 'Order #7 confirmed',
      html: '<p>hi</p>',
    })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('sent'))
  })

  it('#120 Resend rejects → throws (callers swallow; order writes unaffected)', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_bad')
    vi.stubEnv('EMAIL_FROM', 'orders@buildmyrig.test')
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' })

    await expect(
      sendResendEmail({ to: 'a@b.c', subject: 's', html: '<p>x</p>' }, logger),
    ).rejects.toThrow(/resend 401/)
    expect(logger.error).toHaveBeenCalled()
  })
})

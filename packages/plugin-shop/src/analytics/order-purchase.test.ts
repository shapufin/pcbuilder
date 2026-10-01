import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { orderPurchaseAfterChange } from './order-purchase.ts'

type HookArgs = Parameters<typeof orderPurchaseAfterChange>[0]

const makeLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const makeArgs = ({
  doc,
  operation,
  logger,
}: {
  doc: Record<string, unknown>
  operation: 'create' | 'update'
  logger: ReturnType<typeof makeLogger>
}): HookArgs => ({ doc, operation, req: { payload: { logger } } }) as unknown as HookArgs

describe('orderPurchaseAfterChange (entry 23 — purchase event)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) })
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'shop.example.com')
    vi.stubEnv('BMR_URL', 'https://shop.example.com/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('#167 create → purchase event with order props + EUR revenue (cents / 100); send failure never throws', async () => {
    const logger = makeLogger()
    await orderPurchaseAfterChange(
      makeArgs({ operation: 'create', logger, doc: { id: 7, status: 'processing', amount: 129950 } }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.name).toBe('purchase')
    expect(body.url).toBe('https://shop.example.com/checkout')
    expect(body.props).toEqual({ order_id: '7' })
    expect(body.revenue).toEqual({ currency: 'EUR', amount: 1299.5 })

    // Plausible being down must not break the order write (settlement path).
    fetchMock.mockRejectedValue(new Error('plausible down'))
    await expect(
      orderPurchaseAfterChange(
        makeArgs({ operation: 'create', logger, doc: { id: 8, status: 'processing', amount: 500 } }),
      ),
    ).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalled()
  })

  it('#168 skips: no domain (dry-run), non-create ops, cancelled/refunded creates', async () => {
    const logger = makeLogger()
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', '')
    await orderPurchaseAfterChange(
      makeArgs({ operation: 'create', logger, doc: { id: 1, status: 'processing', amount: 100 } }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('dry-run'))

    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'shop.example.com')
    await orderPurchaseAfterChange(
      makeArgs({ operation: 'update', logger, doc: { id: 2, status: 'completed', amount: 100 } }),
    )
    await orderPurchaseAfterChange(
      makeArgs({ operation: 'create', logger, doc: { id: 3, status: 'cancelled', amount: 100 } }),
    )
    await orderPurchaseAfterChange(
      makeArgs({ operation: 'create', logger, doc: { id: 4, status: 'refunded', amount: 100 } }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

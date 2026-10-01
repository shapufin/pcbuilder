import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lowStockAlertAfterChange } from './low-stock.ts'

type HookArgs = Parameters<typeof lowStockAlertAfterChange>[0]

const makeLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const makeArgs = ({
  doc,
  operation,
  user,
  logger,
  order,
}: {
  doc: Record<string, unknown>
  operation?: 'create' | 'update'
  user?: { roles: string[] } | null
  logger: ReturnType<typeof makeLogger>
  order?: Record<string, unknown>
}): HookArgs =>
  ({
    doc,
    operation,
    req: {
      payload: { logger, findByID: vi.fn().mockResolvedValue(order ? { items: order.items } : null) },
      user,
    },
  }) as unknown as HookArgs

/**
 * Entry 23: low-stock staff alert. Fires on order creation only when the
 * order was made by the system (webhook settlement / confirm poll) — staff
 * manual creates are skipped because they don't decrement inventory, so the
 * projected stock would be wrong. Stock is read pre-decrement (settlement
 * creates the order before the inventory $inc loop), so `after` is the
 * projected post-settlement level. Crossing rule: alert only when stock
 * moves from above LOW_STOCK_MAX to at-or-below it (products parked at/below
 * the threshold forever would otherwise alert on every order).
 */
describe('lowStockAlertAfterChange (entry 23)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'e9' }) })
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'shop@buildmyrig.test')
    vi.stubEnv('STAFF_ALERT_EMAIL', 'alerts@buildmyrig.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('#169 threshold crossing (6 → 5) → one alert to STAFF_ALERT_EMAIL; send failure never throws', async () => {
    const logger = makeLogger()
    const items = [{ product: { id: 31, title: 'RTX 5080', inventory: 6 }, quantity: 1 }]
    await lowStockAlertAfterChange(
      makeArgs({ operation: 'create', logger, doc: { id: 7, status: 'processing' }, order: { items } }),
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.to).toEqual(['alerts@buildmyrig.test'])
    expect(body.subject).toContain('Low stock')
    expect(body.html).toContain('RTX 5080')
    expect(body.html).toContain('6 → 5')

    // Alert failure must never break the order write.
    fetchMock.mockRejectedValue(new Error('resend down'))
    await expect(
      lowStockAlertAfterChange(
        makeArgs({ operation: 'create', logger, doc: { id: 8, status: 'processing' }, order: { items } }),
      ),
    ).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalled()
  })

  it('#170 skips: non-create, staff user, missing STAFF_ALERT_EMAIL, at/below threshold, target-less items', async () => {
    const logger = makeLogger()
    const crossing = { items: [{ product: { id: 31, title: 'RTX 5080', inventory: 6 }, quantity: 1 }] }

    // Non-create operation (no order read, no send).
    await lowStockAlertAfterChange(makeArgs({ operation: 'update', logger, doc: { id: 1 } }))
    expect(fetchMock).not.toHaveBeenCalled()

    // Staff manual creates don't decrement inventory — skip (covers admin/manager too).
    for (const roles of [['staff'], ['admin'], ['manager']]) {
      await lowStockAlertAfterChange(
        makeArgs({ operation: 'create', logger, doc: { id: 2 }, user: { roles }, order: crossing }),
      )
    }
    expect(fetchMock).not.toHaveBeenCalled()

    // At threshold (5 → 4) and already below (4 → 3): no crossing, no alert.
    await lowStockAlertAfterChange(
      makeArgs({
        operation: 'create',
        logger,
        doc: { id: 3 },
        order: { items: [{ product: { id: 31, title: 'At 5', inventory: 5 }, quantity: 1 }] },
      }),
    )
    await lowStockAlertAfterChange(
      makeArgs({
        operation: 'create',
        logger,
        doc: { id: 3 },
        order: { items: [{ product: { id: 32, title: 'Below 4', inventory: 4 }, quantity: 1 }] },
      }),
    )
    expect(fetchMock).not.toHaveBeenCalled()

    // Composite/build line with no product/variant target — nothing to read.
    await lowStockAlertAfterChange(
      makeArgs({
        operation: 'create',
        logger,
        doc: { id: 4 },
        order: { items: [{ buildName: 'My Rig', quantity: 1 }] },
      }),
    )
    expect(fetchMock).not.toHaveBeenCalled()

    // No recipient env → logged dry-run, no send.
    vi.stubEnv('STAFF_ALERT_EMAIL', '')
    await lowStockAlertAfterChange(
      makeArgs({ operation: 'create', logger, doc: { id: 5 }, order: crossing }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('STAFF_ALERT_EMAIL'))
  })

  it('#171 aggregates same-target items, targets variants, skips non-crossing, escapes titles', async () => {
    const logger = makeLogger()
    await lowStockAlertAfterChange(
      makeArgs({
        operation: 'create',
        logger,
        doc: { id: 9, status: 'processing' },
        order: {
          items: [
            // Same product twice → one aggregated row (6 → 4).
            { product: { id: 31, title: 'RTX 5080', inventory: 6 }, quantity: 1 },
            { product: { id: 31, title: 'RTX 5080', inventory: 6 }, quantity: 1 },
            // Crosses with an injected title → must render escaped.
            { product: { id: 44, title: '<b>Evil</b>', inventory: 6 }, quantity: 1 },
            // Variant target (own inventory row).
            { variant: { id: 9, title: 'OC', inventory: 8 }, quantity: 4 },
            // Never crosses (12 → 11) → absent from the alert.
            { product: { id: 55, title: 'Quiet Fan', inventory: 12 }, quantity: 1 },
            // No target → skipped.
            { buildName: 'My Rig', quantity: 1 },
          ],
        },
      }),
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.to).toEqual(['alerts@buildmyrig.test'])
    expect(body.html.split('RTX 5080').length - 1).toBe(1) // aggregated, not per line
    expect(body.html).toContain('6 → 4')
    expect(body.html).toContain('OC')
    expect(body.html).toContain('8 → 4')
    expect(body.html).toContain('&lt;b&gt;Evil&lt;/b&gt;')
    expect(body.html).not.toContain('<b>Evil</b>')
    expect(body.html).not.toContain('Quiet Fan')
    expect(body.html).not.toContain('My Rig')
  })
})

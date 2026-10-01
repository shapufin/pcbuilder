import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatEur, orderConfirmationHtml, orderShippedHtml } from './templates.ts'
import { orderEmailsAfterChange } from './order-emails.ts'

type HookArgs = Parameters<typeof orderEmailsAfterChange>[0]

const baseLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const makePayload = (overrides: Record<string, unknown> = {}) => ({
  logger: baseLogger(),
  findByID: vi.fn().mockResolvedValue(null),
  find: vi.fn().mockResolvedValue({ docs: [] }),
  ...overrides,
})

const makeArgs = ({
  doc,
  operation,
  previousDoc,
  payload,
}: {
  doc: Record<string, unknown>
  operation: 'create' | 'update'
  previousDoc?: Record<string, unknown>
  payload: ReturnType<typeof makePayload>
}): HookArgs =>
  ({ doc, operation, previousDoc, req: { payload } }) as unknown as HookArgs

/**
 * Entry 20 (Phase 5 Step B part 2): order lifecycle emails per
 * 04-collections/commerce.md hooks (confirmation on paid order creation,
 * shipping notice on fulfilment) + 12-integrations Resend transport.
 *
 * Real statuses are plugin-ecommerce's OrderStatus
 * ('processing' | 'completed' | 'cancelled' | 'refunded'): orders are created
 * by the settled Stripe webhook (paid), staff move them to completed when
 * fulfilled/shipped (docs/admin-training.md).
 */
describe('order email templates (entry 20)', () => {
  it('#121 escapes user-controlled HTML and shows id, total, lines, address', () => {
    const conf = orderConfirmationHtml({
      orderId: 7,
      total: '€1,299.00',
      lines: [{ name: '<script>alert(1)</script> RTX Build', quantity: 2 }],
      email: 'a&b@example.com',
      address: 'Evil St <b>1</b>',
    })
    expect(conf).not.toContain('<script>')
    expect(conf).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(conf).toContain('1,299') // total rendered
    expect(conf).toContain('€1,299.00')
    expect(conf).toContain('#7')
    expect(conf).toContain('a&amp;b@example.com')
    expect(conf).toContain('Evil St &lt;b&gt;1&lt;/b&gt;')

    const shipped = orderShippedHtml({ orderId: 7, total: '€10.00', lines: [] })
    expect(shipped).toContain('#7')
    expect(shipped.toLowerCase()).toContain('ship')

    expect(formatEur(129900)).toBe('€1,299.00')
    expect(formatEur(5)).toBe('€0.05')
    expect(formatEur(null)).toBe('€0.00')
    expect(formatEur(NaN)).toBe('€0.00')
  })
})

describe('orderEmailsAfterChange (entry 20)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'e1' }) })
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'orders@buildmyrig.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('#122 create (paid settlement) → confirmation to the guest email; never throws on send failure', async () => {
    const payload = makePayload()
    const args = makeArgs({
      operation: 'create',
      payload,
      doc: { id: 7, status: 'processing', customerEmail: 'guest@example.com', amount: 129900, currency: 'EUR', items: [] },
    })
    await orderEmailsAfterChange(args)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.to).toEqual(['guest@example.com'])
    expect(body.subject).toContain('#7')

    // Send failure must not break the order write (webhook settlement path).
    fetchMock.mockRejectedValue(new Error('resend down'))
    await expect(
      orderEmailsAfterChange(
        makeArgs({
          operation: 'create',
          payload,
          doc: { id: 8, status: 'processing', customerEmail: 'g2@example.com', items: [] },
        }),
      ),
    ).resolves.toBeUndefined()
    expect(payload.logger.error).toHaveBeenCalled()
  })

  it('#123 no resolvable recipient → no send + warn; update shipping transition only', async () => {
    const payload = makePayload()
    // No email anywhere → warn, no fetch.
    await orderEmailsAfterChange(
      makeArgs({ operation: 'create', payload, doc: { id: 9, status: 'processing', items: [] } }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(payload.logger.warn).toHaveBeenCalledWith(expect.stringContaining('no email'))

    // processing → completed = shipped (admin-training fulfilment) → shipping mail.
    await orderEmailsAfterChange(
      makeArgs({
        operation: 'update',
        payload,
        doc: { id: 10, status: 'completed', customerEmail: 's@example.com', items: [] },
        previousDoc: { id: 10, status: 'processing', customerEmail: 's@example.com' },
      }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.subject.toLowerCase()).toContain('ship')

    // Unrelated updates send nothing.
    fetchMock.mockClear()
    await orderEmailsAfterChange(
      makeArgs({
        operation: 'update',
        payload,
        doc: { id: 11, status: 'completed', customerEmail: 's@example.com' },
        previousDoc: { id: 11, status: 'completed', customerEmail: 's@example.com' },
      }),
    )
    await orderEmailsAfterChange(
      makeArgs({
        operation: 'update',
        payload,
        doc: { id: 12, status: 'cancelled', customerEmail: 's@example.com' },
        previousDoc: { id: 12, status: 'processing', customerEmail: 's@example.com' },
      }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

/**
 * Review-round additions (entry 20): the webhook writes customer XOR
 * customerEmail, so registered-buyer recipient resolution and the whole
 * email-content path (depth re-read, line names, address) must be covered.
 */
describe('orderEmailsAfterChange — registered buyers & content (review fixes)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'e2' }) })
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'orders@buildmyrig.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('#124 customer id → findByID(users) resolves the recipient', async () => {
    const payload = makePayload()
    payload.findByID = vi.fn(async ({ collection }: { collection: string }) =>
      collection === 'users' ? { id: 42, email: 'member@example.com' } : null,
    ) as never
    await orderEmailsAfterChange(
      makeArgs({
        operation: 'create',
        payload,
        doc: { id: 21, status: 'processing', customer: 42, items: [] },
      }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.to).toEqual(['member@example.com'])
    expect(body.subject).toContain('#21')
  })

  it('#125 populated customer object → email without a users lookup', async () => {
    const payload = makePayload()
    await orderEmailsAfterChange(
      makeArgs({
        operation: 'create',
        payload,
        doc: { id: 22, status: 'processing', customer: { email: 'obj@example.com' }, items: [] },
      }),
    )
    expect(payload.findByID).not.toHaveBeenCalled()
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.to).toEqual(['obj@example.com'])
  })

  it('#126 users lookup failure → warn + no send, never throws', async () => {
    const payload = makePayload()
    payload.findByID = vi.fn().mockRejectedValue(new Error('db down')) as never
    await expect(
      orderEmailsAfterChange(
        makeArgs({
          operation: 'create',
          payload,
          doc: { id: 23, status: 'processing', customer: 7, items: [] },
        }),
      ),
    ).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(payload.logger.warn).toHaveBeenCalledWith(expect.stringContaining('no email'))
  })

  it('#127 content path: depth re-read titles, buildName, address assembly, raw-id fallback', async () => {
    const payload = makePayload()
    payload.findByID = vi.fn().mockResolvedValue({
      items: [
        { buildName: 'My Rig', quantity: 1 },
        { product: { title: 'RTX 5080' }, variant: { title: 'OC Edition' }, quantity: 2 },
        { product: 77, quantity: 1 },
      ],
    }) as never
    await orderEmailsAfterChange(
      makeArgs({
        operation: 'create',
        payload,
        doc: {
          id: 24,
          status: 'processing',
          customerEmail: 'c@example.com',
          amount: 99900,
          items: [{ quantity: 1 }],
          shippingAddress: {
            firstName: 'Ana',
            lastName: 'Reyes',
            addressLine1: 'Main St 1',
            postalCode: '28001',
            city: 'Madrid',
            country: 'ES',
          },
        },
      }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.html).toContain('My Rig')
    expect(body.html).toContain('RTX 5080 (OC Edition)')
    expect(body.html).toContain('Product #77')
    expect(body.html).toContain('Ana Reyes, Main St 1, 28001 Madrid, ES')
    expect(body.html).toContain('€999.00')
  })
})

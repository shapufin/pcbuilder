import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { resolveComponentSpecs } from './component-specs.server'

/**
 * Audit 2026-10-24: the PDP spec fallback re-fetched the product at depth 1
 * and then the component again even though `product.component` arrives
 * populated at depth 2. The resolver must read the populated relationship
 * for free and keep the variant-linked lookup priority.
 */

const makePayload = (over: Partial<Record<'find' | 'findByID', unknown>> = {}) =>
  ({
    find: vi.fn(async () => ({ docs: [] })),
    findByID: vi.fn(async () => null),
    ...over,
  }) as unknown as Payload & { find: ReturnType<typeof vi.fn>; findByID: ReturnType<typeof vi.fn> }

describe('resolveComponentSpecs', () => {
  it('reads an already-populated component without issuing any query', async () => {
    const payload = makePayload()
    const product = { component: { id: 9, specsJson: { socket: 'AM5' } } }
    const specs = await resolveComponentSpecs(product, [], payload)
    expect(specs).toEqual({ socket: 'AM5' })
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.findByID).not.toHaveBeenCalled()
  })

  it('prefers the variant-linked component lookup over the product relationship', async () => {
    const payload = makePayload({
      find: vi.fn(async ({ where }: { where?: { productVariant?: { in?: unknown[] } } }) => {
        expect(where?.productVariant?.in).toEqual([90])
        return { docs: [{ id: 9, specsJson: { socket: 'AM5', tdp: 120 } }] }
      }),
    })
    const product = { component: { id: 8, specsJson: { socket: 'LGA1700' } } }
    const specs = await resolveComponentSpecs(product, [90], payload)
    expect(specs).toEqual({ socket: 'AM5', tdp: 120 })
  })

  it('falls back to a single findByID when the relationship is an unpopulated id', async () => {
    const payload = makePayload({
      findByID: vi.fn(async () => ({ id: 8, specsJson: { ddr: 'DDR5' } })),
    })
    const specs = await resolveComponentSpecs({ component: 8 }, [], payload)
    expect(specs).toEqual({ ddr: 'DDR5' })
    expect(payload.findByID).toHaveBeenCalledTimes(1)
  })

  it('returns null on a lookup failure (best-effort fallback)', async () => {
    const payload = makePayload({
      find: vi.fn(async () => {
        throw new Error('db down')
      }),
      findByID: vi.fn(async () => {
        throw new Error('db down')
      }),
    })
    expect(await resolveComponentSpecs({ component: 8 }, [90], payload)).toBeNull()
  })
})

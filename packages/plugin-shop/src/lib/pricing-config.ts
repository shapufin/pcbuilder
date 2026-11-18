import type { PayloadRequest } from 'payload'

/**
 * Enabled shipping-bands / tax-rates are tiny config tables read on EVERY
 * cart write (recomputeCartTotals). Same single-instance TTL + inflight-dedup
 * pattern as the builder index: admin edits invalidate through the
 * collections' afterChange/afterDelete hooks, the 30 s TTL only covers
 * out-of-band writes (seed scripts, direct SQL).
 */

const TTL_MS = 30_000

type CacheEntry = { docs: unknown[]; storedAt: number }

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown[]>>()

/** Called by the shipping-bands / tax-rates collection hooks on any write. */
export const invalidatePricingConfig = (): void => {
  cache.clear()
}

const cachedEnabledFind = async (
  collection: string,
  req: PayloadRequest,
): Promise<unknown[]> => {
  const hit = cache.get(collection)
  if (hit && Date.now() - hit.storedAt < TTL_MS) return hit.docs
  const pending = inflight.get(collection)
  if (pending) return pending
  const promise = (async () => {
    const res = await req.payload.find({
      collection: collection as never,
      where: { enabled: { equals: true } } as never,
      limit: 100,
      depth: 0,
      overrideAccess: true,
      req,
    })
    cache.set(collection, { docs: res.docs as unknown[], storedAt: Date.now() })
    return res.docs as unknown[]
  })()
  inflight.set(collection, promise)
  try {
    return await promise
  } finally {
    inflight.delete(collection)
  }
}

export const getEnabledShippingBands = (req: PayloadRequest): Promise<unknown[]> =>
  cachedEnabledFind('shipping-bands', req)

export const getEnabledTaxRates = (req: PayloadRequest): Promise<unknown[]> =>
  cachedEnabledFind('tax-rates', req)

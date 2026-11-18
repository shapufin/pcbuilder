import type { Payload } from 'payload'

/**
 * Data retention (audit 2026-11-18 C1). Anonymous storefront writes — guest
 * carts and unclaimed builds — previously accumulated forever; the IP rate
 * limiters bound the rate, not the total. A nightly Payload job calls this.
 *
 * Only rows nothing depends on are deleted:
 * - carts: guest (no customer), never purchased, untouched for CART_TTL_DAYS,
 *   and not referenced by a transaction or an inventory reservation;
 * - configured-builds: unclaimed (no user), older than BUILD_TTL_DAYS (share
 *   links stay valid that long), and not referenced by any cart or order line.
 *
 * Each run handles at most BATCH rows per kind; the next night continues.
 */
export const CART_TTL_DAYS = 30
export const BUILD_TTL_DAYS = 90
const BATCH = 200

type IdDoc = { id: string | number }
const ids = (docs: unknown[]): Array<string | number> => (docs as IdDoc[]).map((d) => d.id)
const relId = (v: unknown): string =>
  String(v && typeof v === 'object' && 'id' in v ? (v as IdDoc).id : v)
const cutoff = (now: Date, days: number): string => new Date(now.getTime() - days * 86_400_000).toISOString()

const findIds = async (payload: Payload, collection: string, where: Record<string, unknown>) =>
  (
    await payload.find({
      collection: collection as never,
      where: where as never,
      limit: BATCH,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
  ).docs

export const pruneStaleGuestData = async (
  payload: Payload,
  now: Date = new Date(),
): Promise<{ carts: number; builds: number }> => {
  // Carts
  const staleCarts = await findIds(payload, 'carts', {
    and: [
      { customer: { exists: false } },
      { purchasedAt: { exists: false } },
      { updatedAt: { less_than: cutoff(now, CART_TTL_DAYS) } },
    ],
  })
  let cartsDeleted = 0
  if (staleCarts.length > 0) {
    const candidate = ids(staleCarts)
    const [txs, holds] = await Promise.all([
      findIds(payload, 'transactions', { cart: { in: candidate } }),
      findIds(payload, 'inventory-reservations', { cart: { in: candidate } }),
    ])
    const keep = new Set([...txs, ...holds].map((d) => relId((d as { cart?: unknown }).cart)))
    const doomed = candidate.filter((id) => !keep.has(String(id)))
    if (doomed.length > 0) {
      const res = await payload.delete({
        collection: 'carts' as never,
        where: { id: { in: doomed } } as never,
        overrideAccess: true,
      })
      cartsDeleted = (res as { docs?: unknown[] }).docs?.length ?? 0
    }
  }

  // Builds
  const staleBuilds = await findIds(payload, 'configured-builds', {
    and: [{ user: { exists: false } }, { createdAt: { less_than: cutoff(now, BUILD_TTL_DAYS) } }],
  })
  let buildsDeleted = 0
  if (staleBuilds.length > 0) {
    const candidate = ids(staleBuilds)
    const [inCarts, inOrders] = await Promise.all([
      findIds(payload, 'carts', { 'items.configuredBuild': { in: candidate } }),
      findIds(payload, 'orders', { 'items.configuredBuild': { in: candidate } }),
    ])
    const keep = new Set<string>()
    for (const doc of [...inCarts, ...inOrders] as { items?: { configuredBuild?: unknown }[] }[]) {
      for (const item of doc.items ?? []) if (item.configuredBuild != null) keep.add(relId(item.configuredBuild))
    }
    const doomed = candidate.filter((id) => !keep.has(String(id)))
    if (doomed.length > 0) {
      const res = await payload.delete({
        collection: 'configured-builds' as never,
        where: { id: { in: doomed } } as never,
        overrideAccess: true,
      })
      buildsDeleted = (res as { docs?: unknown[] }).docs?.length ?? 0
    }
  }

  payload.logger.info(`[retention] pruned ${cartsDeleted} guest carts, ${buildsDeleted} unclaimed builds`)
  return { carts: cartsDeleted, builds: buildsDeleted }
}

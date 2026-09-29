import type { Payload } from 'payload'

/**
 * "Build Stats" admin view aggregation (07-ux-plan.md §8, 12-integrations-ops.md):
 * revenue, orders, build statuses, popular templates, low-stock components.
 * 5-minute in-process cache (single instance, same deviation as rate limiting).
 */

export interface BuildStats {
  revenueCents: number
  orderCount: number
  orderStatusCounts: Record<string, number>
  builds: { total: number; draft: number; addedToCart: number; ordered: number }
  topTemplates: Array<{ id: string; name: string; popularity: number }>
  lowStock: Array<{ id: string; name: string; inventory: number }>
}

const LOW_STOCK_MAX = 5
const STATS_TTL_MS = 5 * 60_000

const idOf = (v: unknown): string => (v && typeof v === 'object' && 'id' in v ? String((v as { id: unknown }).id) : String(v))

const countByStatus = async (payload: Payload, status: string): Promise<number> => {
  const res = await payload.count({
    collection: 'configured-builds',
    where: { status: { equals: status } },
  })
  return res.totalDocs
}

export const computeBuildStats = async (payload: Payload): Promise<BuildStats> => {
  const [ordersRes, totalBuilds, draft, addedToCart, ordered, templatesRes, lowStockRes, allOrders] =
    await Promise.all([
      payload.find({
        collection: 'orders',
        where: { status: { in: ['processing', 'completed'] } },
        limit: 1000,
        depth: 0,
      }),
      payload.count({ collection: 'configured-builds' }),
      countByStatus(payload, 'draft'),
      countByStatus(payload, 'addedToCart'),
      countByStatus(payload, 'ordered'),
      payload.find({ collection: 'build-templates', limit: 5, sort: '-popularity', depth: 0 }),
      payload.find({
        collection: 'products',
        where: { and: [{ inventory: { greater_than: 0 } }, { inventory: { less_than_equal: LOW_STOCK_MAX } }] },
        limit: 20,
        sort: 'inventory',
        depth: 0,
      }),
      payload.count({ collection: 'orders' }),
    ])

  const revenueCents = (ordersRes.docs as Array<{ amount?: number; status?: string }>)
    .filter((o) => o.status === 'processing' || o.status === 'completed')
    .reduce((sum, o) => sum + (typeof o.amount === 'number' ? o.amount : 0), 0)

  const statusEntries = await Promise.all(
    ['pending', 'processing', 'completed', 'cancelled', 'refunded'].map(async (s) => {
      const res = await payload.count({ collection: 'orders', where: { status: { equals: s } } })
      return [s, res.totalDocs] as const
    }),
  )

  return {
    revenueCents,
    orderCount: allOrders.totalDocs,
    orderStatusCounts: Object.fromEntries(statusEntries),
    builds: { total: totalBuilds.totalDocs, draft, addedToCart, ordered },
    topTemplates: (templatesRes.docs as Array<{ id: string | number; name?: string; popularity?: number }>).map(
      (t) => ({ id: idOf(t.id), name: t.name ?? String(t.id), popularity: t.popularity ?? 0 }),
    ),
    lowStock: (lowStockRes.docs as Array<{ id: string | number; name?: string; inventory?: number }>).map((p) => ({
      id: idOf(p.id),
      name: p.name ?? String(p.id),
      inventory: p.inventory ?? 0,
    })),
  }
}

let cachedStats: { data: BuildStats; storedAt: number } | null = null

export const invalidateBuildStats = (): void => {
  cachedStats = null
}

export const getBuildStats = async (payload: Payload): Promise<BuildStats> => {
  if (cachedStats && Date.now() - cachedStats.storedAt < STATS_TTL_MS) return cachedStats.data
  const data = await computeBuildStats(payload)
  cachedStats = { data, storedAt: Date.now() }
  return data
}

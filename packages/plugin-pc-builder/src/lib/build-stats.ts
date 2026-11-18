import type { Payload } from 'payload'
import { getBuilderIndex } from './builder-index.ts'

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
  categoryDepth?: Array<{ name: string; count: number }>
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

export const computeRevenue = async (payload: Payload): Promise<number> => {
  const db = (payload as unknown as { db?: Record<string, unknown> })?.db
  // 1. Direct DB aggregation if database adapter exposes execute or drizzle
  if (typeof db?.execute === 'function') {
    try {
      const res = await (db.execute as (args: { raw: string }) => Promise<unknown>)({
        raw: "SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE status IN ('processing', 'completed')",
      })
      const rows = Array.isArray(res) ? res : (res as { rows?: unknown[] })?.rows ?? [res]
      const first = (rows[0] ?? {}) as Record<string, unknown>
      const total = first.total ?? first.sum ?? (typeof first === 'number' ? first : null)
      if (total !== null && !isNaN(Number(total))) {
        return Number(total)
      }
    } catch {
      // Fallback to query accumulator below
    }
  }

  const drizzle = db?.drizzle as { all?: (q: unknown) => Promise<unknown>; execute?: (q: unknown) => Promise<unknown> } | undefined
  if (drizzle) {
    try {
      const res = typeof drizzle.all === 'function'
        ? await drizzle.all({ sql: "SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE status IN ('processing', 'completed')", params: [] })
        : typeof drizzle.execute === 'function'
          ? await drizzle.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE status IN ('processing', 'completed')")
          : null
      if (res) {
        const rows = Array.isArray(res) ? res : (res as { rows?: unknown[] })?.rows ?? [res]
        const first = (rows[0] ?? {}) as Record<string, unknown>
        const total = first.total ?? first.sum ?? (typeof first === 'number' ? first : null)
        if (total !== null && !isNaN(Number(total))) {
          return Number(total)
        }
      }
    } catch {
      // Fallback to query accumulator below
    }
  }

  // 2. Uncapped paginated accumulator (guarantees datasets > 1,000 orders are never truncated)
  let page = 1
  let hasMore = true
  let totalRevenue = 0
  while (hasMore) {
    const ordersRes = await payload.find({
      collection: 'orders',
      where: { status: { in: ['processing', 'completed'] } },
      limit: 1000,
      page,
      depth: 0,
      select: { amount: true, status: true },
    })
    const docs = (ordersRes.docs || []) as Array<{ amount?: number; status?: string }>
    if (docs.length === 0) break
    for (const o of docs) {
      if (o.status === 'processing' || o.status === 'completed') {
        totalRevenue += typeof o.amount === 'number' ? o.amount : 0
      }
    }
    if (ordersRes.hasNextPage === false || docs.length < 1000) {
      hasMore = false
    } else {
      page++
    }
  }
  return totalRevenue
}

export const computeBuildStats = async (payload: Payload): Promise<BuildStats> => {
  const [revenueCents, totalBuilds, draft, addedToCart, ordered, templatesRes, lowStockRes, allOrders] =
    await Promise.all([
      computeRevenue(payload),
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

  const statusEntries = await Promise.all(
    ['pending', 'processing', 'completed', 'cancelled', 'refunded'].map(async (s) => {
      const res = await payload.count({ collection: 'orders', where: { status: { equals: s } } })
      return [s, res.totalDocs] as const
    }),
  )

  let categoryDepth: Array<{ name: string; count: number }> = []
  try {
    const index = await getBuilderIndex(payload)
    if (index?.categories && Array.isArray(index.components)) {
      categoryDepth = index.categories.map((c) => ({
        name: c.name,
        count: index.components.filter((comp) => comp.categoryId === c.id).length,
      }))
    }
  } catch {
    // Graceful fallback if builder index fails to construct
  }

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
    categoryDepth,
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

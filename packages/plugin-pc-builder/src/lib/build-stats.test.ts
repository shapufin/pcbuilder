import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Payload } from 'payload'
import { computeBuildStats, getBuildStats, invalidateBuildStats } from './build-stats.ts'

const order = (amount: number, status: string) => ({ amount, status })

const fakePayload = (overrides: Record<string, unknown> = {}): Payload => {
  const store: Record<string, { docs?: unknown[]; totalDocs?: number }> = {
    orders: { docs: [order(129900, 'processing'), order(259900, 'completed'), order(99900, 'refunded')], totalDocs: 7 },
    'configured-builds': { totalDocs: 12 },
    'build-templates': { docs: [{ id: 1, name: 'RTX Starter', popularity: 9 }, { id: 2, name: 'Silent Work', popularity: 4 }] },
    products: { docs: [{ id: 5, name: 'Case Fan', inventory: 3 }, { id: 6, name: 'PSU 550W', inventory: 1 }] },
    ...overrides,
  }
  return {
    find: async ({ collection }: { collection: string }) => store[collection] ?? { docs: [] },
    count: async ({ collection, where }: { collection: string; where?: { status?: { equals?: string } } }) => {
      if (collection === 'orders' && where?.status?.equals) {
        const statuses: Record<string, number> = {
          processing: 3,
          completed: 2,
          pending: 1,
          cancelled: 0,
          refunded: 1,
        }
        return { totalDocs: statuses[where.status.equals] ?? 0 }
      }
      if (collection === 'configured-builds' && where?.status?.equals) {
        const statuses: Record<string, number> = { draft: 8, addedToCart: 3, ordered: 1 }
        return { totalDocs: statuses[where.status.equals] ?? 0 }
      }
      return { totalDocs: store[collection]?.totalDocs ?? 0 }
    },
  } as unknown as Payload
}

describe('Build Stats aggregation (entry 14, 07-ux-plan §8)', () => {
  afterEach(() => {
    invalidateBuildStats()
    vi.restoreAllMocks()
  })

  it('#70 revenue counts processing+completed only; builds and statuses aggregate', async () => {
    const stats = await computeBuildStats(fakePayload())
    expect(stats.revenueCents).toBe(129900 + 259900)
    expect(stats.orderCount).toBe(7)
    expect(stats.orderStatusCounts).toMatchObject({ processing: 3, completed: 2, refunded: 1 })
    expect(stats.builds).toEqual({ total: 12, draft: 8, addedToCart: 3, ordered: 1 })
    expect(stats.topTemplates[0]).toEqual({ id: '1', name: 'RTX Starter', popularity: 9 })
    expect(stats.lowStock).toEqual([
      { id: '5', name: 'Case Fan', inventory: 3 },
      { id: '6', name: 'PSU 550W', inventory: 1 },
    ])
  })

  it('#71 getBuildStats caches for 5 minutes; invalidateBuildStats() forces recompute', async () => {
    invalidateBuildStats()
    let calls = 0
    const base = fakePayload()
    const payload = {
      find: async (args: { collection: string }) => {
        calls += 1
        return base.find(args)
      },
      count: async (args: { collection: string }) => {
        calls += 1
        return (base as any).count(args)
      },
    } as unknown as Payload

    await getBuildStats(payload)
    const afterFirst = calls
    await getBuildStats(payload)
    expect(calls).toBe(afterFirst)

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5 * 60_000 + 1)
    await getBuildStats(payload)
    expect(calls).toBeGreaterThan(afterFirst)
  })
})

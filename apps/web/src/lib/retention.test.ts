/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles for the Payload local API */
import { describe, expect, it, vi } from 'vitest'
import { pruneStaleGuestData } from './retention.ts'

/**
 * Audit 2026-11-18 C1: guest carts and anonymous builds grew without bound.
 * The nightly retention task deletes only rows nothing else depends on.
 */
type Row = Record<string, any>
const NOW = new Date('2026-11-18T03:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const get = (row: Row, path: string): unknown[] => {
  const [head, ...rest] = path.split('.')
  const v = row[head!]
  if (rest.length === 0) return [v && typeof v === 'object' && 'id' in v ? v.id : v]
  return Array.isArray(v) ? v.flatMap((x) => get(x, rest.join('.'))) : []
}
const match = (row: Row, where: Row): boolean => {
  if (where.and) return where.and.every((w: Row) => match(row, w))
  if (where.or) return where.or.some((w: Row) => match(row, w))
  return Object.entries(where).every(([path, cond]: [string, any]) => {
    const vals = get(row, path)
    if ('exists' in cond) return cond.exists ? vals.some((v) => v != null) : vals.every((v) => v == null)
    if ('equals' in cond) return vals.some((v) => (cond.equals === null ? v == null : String(v) === String(cond.equals)))
    if ('less_than' in cond) return vals.some((v) => typeof v === 'string' && v < cond.less_than)
    if ('in' in cond) return vals.some((v) => cond.in.map(String).includes(String(v)))
    throw new Error(`unsupported ${JSON.stringify(cond)}`)
  })
}

const makePayload = (store: Record<string, Row[]>) => ({
  find: vi.fn(async ({ collection, where, limit }: Row) => {
    const docs = (store[collection] ?? []).filter((r) => match(r, where ?? {})).slice(0, limit ?? 10)
    return { docs, totalDocs: docs.length }
  }),
  delete: vi.fn(async ({ collection, where }: Row) => {
    const gone = (store[collection] ?? []).filter((r) => match(r, where))
    store[collection] = (store[collection] ?? []).filter((r) => !gone.includes(r))
    return { docs: gone, errors: [] }
  }),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
})

describe('pruneStaleGuestData (audit 2026-11-18 C1)', () => {
  it('#750 deletes only abandoned guest carts with no payment trail', async () => {
    const store: Record<string, Row[]> = {
      carts: [
        { id: 1, customer: null, purchasedAt: null, updatedAt: daysAgo(45) }, // prune
        { id: 2, customer: 7, purchasedAt: null, updatedAt: daysAgo(45) }, // account cart: keep
        { id: 3, customer: null, purchasedAt: daysAgo(40), updatedAt: daysAgo(40) }, // purchased: keep
        { id: 4, customer: null, purchasedAt: null, updatedAt: daysAgo(3) }, // fresh: keep
        { id: 5, customer: null, purchasedAt: null, updatedAt: daysAgo(60) }, // has a transaction: keep
        { id: 6, customer: null, purchasedAt: null, updatedAt: daysAgo(60) }, // has a reservation: keep
      ],
      transactions: [{ id: 50, cart: 5 }],
      'inventory-reservations': [{ id: 60, cart: 6 }],
      'configured-builds': [],
      orders: [],
    }
    const result = await pruneStaleGuestData(makePayload(store) as never, NOW)
    expect(store.carts.map((c) => c.id)).toEqual([2, 3, 4, 5, 6])
    expect(result.carts).toBe(1)
  })

  it('#751 deletes only old unclaimed builds that no cart or order references', async () => {
    const store: Record<string, Row[]> = {
      carts: [{ id: 9, customer: 7, purchasedAt: null, updatedAt: daysAgo(1), items: [{ configuredBuild: 21 }] }],
      orders: [{ id: 30, items: [{ configuredBuild: { id: 22 } }] }],
      transactions: [],
      'inventory-reservations': [],
      'configured-builds': [
        { id: 20, user: null, createdAt: daysAgo(120) }, // prune
        { id: 21, user: null, createdAt: daysAgo(120) }, // in a cart: keep
        { id: 22, user: null, createdAt: daysAgo(120) }, // ordered: keep
        { id: 23, user: 7, createdAt: daysAgo(400) }, // claimed: keep
        { id: 24, user: null, createdAt: daysAgo(10) }, // recent share link: keep
      ],
    }
    const result = await pruneStaleGuestData(makePayload(store) as never, NOW)
    expect(store['configured-builds'].map((b) => b.id)).toEqual([21, 22, 23, 24])
    expect(result.builds).toBe(1)
  })
})

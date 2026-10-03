import { describe, it, expect, vi } from 'vitest'
import { checkLiveProductIds, MAX_WISHLIST_CHECK } from './wishlist.ts'

/**
 * Wishlist staleness (plan item C5): saved snapshots outlive their products,
 * so the client asks which ids still resolve as published products.
 */
type FindArgs = { where: { and: Array<{ id: { in: string[] } }> }; limit: number }

const makePayload = (liveIds: Array<string | number>) => ({
  find: vi.fn(async (_args: FindArgs) => ({ docs: liveIds.map((id) => ({ id })) })),
})

describe('checkLiveProductIds', () => {
  it('#261 splits requested ids into live and stale, preserving string form', async () => {
    const payload = makePayload([7, 'abc'])
    const r = await checkLiveProductIds(payload as never, [7, 'abc', 'gone'])
    expect(r.live).toEqual(['7', 'abc'])
    expect(r.stale).toEqual(['gone'])
  })

  it('#262 filters to published only (explicit _status, not the access layer)', async () => {
    const payload = makePayload([])
    await checkLiveProductIds(payload as never, [7])
    const where = JSON.stringify(payload.find.mock.calls[0][0].where)
    expect(where).toContain('published')
  })

  it('#263 dedupes, drops junk, caps at the wishlist limit, and skips the query when empty', async () => {
    const payload = makePayload([])
    const many = Array.from({ length: 80 }, (_, i) => `p${i}`)
    await checkLiveProductIds(payload as never, [...many, 'p0', null, {}])
    const arg = payload.find.mock.calls[0][0]
    expect(arg.where.and[0].id.in).toHaveLength(MAX_WISHLIST_CHECK)

    const empty = makePayload([])
    expect(await checkLiveProductIds(empty as never, 'nope')).toEqual({ live: [], stale: [] })
    expect(empty.find).not.toHaveBeenCalled()
  })
})

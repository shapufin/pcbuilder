import type { Payload } from 'payload'

/**
 * Wishlist staleness check (audit minor C5 / plan item C5). The wishlist is
 * localStorage-first, so a saved item can outlive its product (deleted or
 * unpublished) — the client renders stale titles/prices and dead links. The
 * client posts its ids here and marks whatever no longer resolves.
 */

/** The wishlist store caps at 50 items; the check accepts no more. */
export const MAX_WISHLIST_CHECK = 50

export type LiveWishlistResult = {
  /** Ids (as strings) that still exist AND are published. */
  live: string[]
  /** Ids that no longer resolve — the client marks these unavailable. */
  stale: string[]
}

const normalize = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  for (const raw of ids) {
    if (typeof raw !== 'string' && typeof raw !== 'number') continue
    const id = String(raw).trim()
    if (!id || out.includes(id)) continue
    out.push(id)
    if (out.length >= MAX_WISHLIST_CHECK) break
  }
  return out
}

/**
 * Filters the requested ids down to live, published products. Explicit
 * `_status` filter (not the access layer) so the result is the same whether
 * or not the caller bypasses access.
 */
export const checkLiveProductIds = async (
  payload: Payload,
  ids: unknown,
): Promise<LiveWishlistResult> => {
  const requested = normalize(ids)
  if (requested.length === 0) return { live: [], stale: [] }
  const result = await payload.find({
    collection: 'products',
    where: {
      and: [{ id: { in: requested } }, { _status: { equals: 'published' } }],
    },
    limit: MAX_WISHLIST_CHECK,
    depth: 0,
    pagination: false,
  })
  const live = (result.docs as Array<{ id: string | number }>).map((d) => String(d.id))
  return { live, stale: requested.filter((id) => !live.includes(id)) }
}

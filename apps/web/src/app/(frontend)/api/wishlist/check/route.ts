import type { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/shop'
import { rateLimit } from '@buildmyrig/lib'
import { checkLiveProductIds, MAX_WISHLIST_CHECK } from '@/lib/wishlist'

/**
 * POST /api/wishlist/check — which saved wishlist ids still resolve as
 * published products (plan item C5). Read-only; the client marks stale items
 * and offers to prune them. Rate-limited because it hits the DB per call.
 */
const limiter = rateLimit({ windowMs: 60_000, max: 20 })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limited = limiter.check(ip)
  if (!limited.ok) {
    return Response.json(
      { error: 'rate limit exceeded', retryAfterMs: limited.retryAfterMs },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  const ids = (body as { ids?: unknown } | null)?.ids
  if (!Array.isArray(ids) || ids.length > MAX_WISHLIST_CHECK) {
    return Response.json({ error: `ids must be an array of at most ${MAX_WISHLIST_CHECK}` }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()
    const result = await checkLiveProductIds(payload, ids)
    return Response.json(result)
  } catch (error) {
    console.error('[wishlist/check] failed:', error)
    return Response.json({ error: 'could not check wishlist items' }, { status: 500 })
  }
}

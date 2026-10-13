import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'
import { rateLimit } from '@buildmyrig/lib'
import { clientIp, defaultAllowedOrigins, isAllowedOrigin } from '@/lib/auth'
import { getPayloadClient } from '@/lib/shop'
import { getStoreSettings } from '@/lib/store-settings.server'

const limiter = rateLimit({ windowMs: 60_000, max: 5 })

/**
 * This explicit `/api/reviews` route shadows Payload's catch-all
 * `(payload)/api/[...slug]` for the reviews collection — without delegation,
 * GET/PATCH/DELETE on the collection REST API 405 (admin list pagination,
 * moderation updates, telemetry). Non-POST methods delegate to Payload REST
 * with a synthetic slug; authenticated POSTs (admin console create) delegate
 * too — Payload's own auth + `create` access (staff-only) apply — while
 * anonymous POSTs keep the rate-limited public submission pipeline below.
 * Access note: reviews `read` exposes `status=approved` only to the public.
 */
const rest = {
  GET: REST_GET(config),
  POST: REST_POST(config),
  PATCH: REST_PATCH(config),
  PUT: REST_PUT(config),
  DELETE: REST_DELETE(config),
  OPTIONS: REST_OPTIONS(config),
}
const restArgs = { params: Promise.resolve({ slug: ['reviews'] }) }

const hasPayloadCredentials = (req: NextRequest): boolean =>
  Boolean(
    req.headers.get('authorization')?.startsWith('JWT ') ||
      req.headers.get('cookie')?.includes('payload-token='),
  )

export const GET = (req: NextRequest) => rest.GET(req, restArgs)
export const PATCH = (req: NextRequest) => rest.PATCH(req, restArgs)
export const PUT = (req: NextRequest) => rest.PUT(req, restArgs)
export const DELETE = (req: NextRequest) => rest.DELETE(req, restArgs)
export const OPTIONS = (req: NextRequest) => rest.OPTIONS(req, restArgs)

const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  comment: z.string().trim().min(5).max(2000),
  authorName: z.string().trim().min(2).max(80),
  authorEmail: z.string().trim().email(),
})

export async function POST(req: NextRequest) {
  // Authenticated (admin/staff) requests → Payload REST create; the schema
  // below is the public submission pipeline only.
  if (hasPayloadCredentials(req)) {
    return rest.POST(req, restArgs)
  }
  if (!isAllowedOrigin(req.headers.get('origin'), defaultAllowedOrigins())) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }

  const ip = clientIp(req.headers)
  const rl = limiter.check(ip)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'retry-after': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = reviewSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid review payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { productId, rating, title, comment, authorName, authorEmail } = parsed.data

  try {
    const storeSettings = await getStoreSettings()
    if (storeSettings.features.reviews === false) {
      return NextResponse.json(
        { error: 'Customer reviews are currently disabled' },
        { status: 403 },
      )
    }

    const payload = await getPayloadClient()

    // Verify product exists
    const product = await payload.findByID({
      collection: 'products',
      id: productId,
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if author has any paid order containing this product
    let verifiedPurchase = false
    try {
      const orders = await payload.find({
        collection: 'orders',
        where: {
          and: [
            { customerEmail: { equals: authorEmail } },
            { status: { in: ['completed', 'processing'] } },
          ],
        },
        limit: 10,
        overrideAccess: true,
      })

      if (orders.docs.length > 0) {
        // Check if any order line item matches this product
        verifiedPurchase = orders.docs.some((order) => {
          const items = (order as { items?: Array<{ product?: unknown }> }).items
          if (!Array.isArray(items)) return false
          return items.some((item) => {
            if (typeof item.product === 'number') return item.product === productId
            if (typeof item.product === 'object' && item.product) {
              return (item.product as { id: number }).id === productId
            }
            return false
          })
        })
      }
    } catch {
      // Order check failure should not block review creation
      verifiedPurchase = false
    }

    // Create review with 'pending' status
    const newReview = await payload.create({
      collection: 'reviews',
      data: {
        product: productId,
        rating,
        title,
        comment,
        authorName,
        authorEmail,
        verifiedPurchase,
        status: 'pending',
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      id: newReview.id,
      message: 'Thank you! Your review has been submitted and is pending moderation.',
    })
  } catch (err) {
    console.error('[reviews-api] failed to submit review:', err)
    return NextResponse.json(
      { error: 'Failed to submit review. Please try again later.' },
      { status: 500 },
    )
  }
}

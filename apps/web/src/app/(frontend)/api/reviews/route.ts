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

/**
 * Audit 2026-11-18 L2: delegate to Payload REST only for a session that
 * actually resolves to staff. Sniffing for a `payload-token=` substring let
 * any forged cookie skip the origin check and rate limiter below.
 */
const isStaffSession = async (req: NextRequest): Promise<boolean> => {
  const header = req.headers.get('authorization') ?? ''
  const cookie = req.headers.get('cookie') ?? ''
  if (!header.startsWith('JWT ') && !cookie.includes('payload-token=')) return false
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: req.headers })
    const roles = (user as { roles?: unknown } | null)?.roles
    return Array.isArray(roles) && roles.some((r) => r === 'admin' || r === 'manager' || r === 'staff')
  } catch {
    return false
  }
}

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
  if (await isStaffSession(req)) {
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
    // disableErrors: a missing product must answer 404, not throw into the 500 path.
    const product = await payload.findByID({
      collection: 'products',
      id: productId,
      disableErrors: true,
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if the *authenticated* author has any paid order containing this
    // product. The badge is only granted to a signed-in buyer whose account
    // email matches the submitted author email — the email field alone is
    // client-controlled, so trusting it let anyone mint a "Verified Buyer"
    // badge with a stranger's address (audit 2026-10-22, #664).
    let verifiedPurchase = false
    try {
      const { user } = await payload.auth({ headers: req.headers })
      const accountEmail =
        user && typeof (user as { email?: unknown }).email === 'string'
          ? String((user as { email: string }).email).trim().toLowerCase()
          : null
      if (accountEmail && accountEmail === authorEmail.toLowerCase()) {
        // Filter items.product server-side (audit 2026-10-24): the previous
        // implementation fetched the 10 most recent orders and scanned their
        // items in JS, so a buyer whose purchase sat beyond that page lost
        // the badge. Dotted array-subfield paths are supported here (same
        // shape as the reservations `items.variant` query).
        const orders = await payload.find({
          collection: 'orders',
          where: {
            and: [
              { customerEmail: { equals: accountEmail } },
              { status: { in: ['completed', 'processing'] } },
              { 'items.product': { equals: productId } },
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        verifiedPurchase = orders.docs.length > 0
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

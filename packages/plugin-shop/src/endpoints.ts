import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'
import { addItem } from '@payloadcms/plugin-ecommerce'
import { rateLimit } from '@buildmyrig/lib'
import { cartItemMatcher, collectBuildIssues } from './lib/line-item-hooks.ts'
import { validateDiscount } from './lib/pricing.ts'

/**
 * POST /api/carts/:id/add-build — add a configured build as a composite line.
 * The ecommerce addItem endpoint requires `product`, so composite lines get
 * their own endpoint (plugin-shop owns cart mutations; the price/validation
 * come from the registered line type via the cart subtotal hook on update).
 *
 * POST /api/carts/:id/validate — pre-flight build validation for checkout:
 * the ecommerce confirmOrder endpoint catches ALL errors into a generic 500,
 * so per-slot reasons must reach the client before payment starts (06-rule-engine.md).
 *
 * POST /api/discounts/validate — stateless code pre-check for the checkout
 * form (audit gap P2-C3): answers "would this code work?" without a cart.
 *
 * POST /api/carts/:id/apply-discount — owner-or-secret gated cart mutation;
 * the cart beforeChange hook recomputes the four totals from the same
 * computeCartTotals math source, so the numbers Stripe charges stay
 * server-derived (the endpoint never writes totals itself).
 */

const addBuildLimiter = rateLimit({ windowMs: 60_000, max: 30 })
const validateLimiter = rateLimit({ windowMs: 60_000, max: 20 })
// Separate buckets: validate is a pre-cart probe, apply is a cart mutation.
const discountValidateLimiter = rateLimit({ windowMs: 60_000, max: 20 })
const discountApplyLimiter = rateLimit({ windowMs: 60_000, max: 20 })
const shippingLimiter = rateLimit({ windowMs: 60_000, max: 20 })

const schema = z.object({
  configuredBuild: z.coerce.string().min(1),
  buildName: z.string().max(120).optional(),
  subItems: z
    .array(
      z.object({
        component: z.coerce.string().min(1),
        quantity: z.number().min(1).default(1),
        name: z.string().max(200).optional(),
      }),
    )
    .max(50)
    .optional(),
  secret: z.string().optional(),
})

const validateSchema = z.object({ secret: z.string().optional() })

const ok = (data: unknown): Response => Response.json(data)
const bad = (status: number, message: string, extra?: unknown, headers?: HeadersInit): Response =>
  Response.json({ error: message, ...(extra ? { details: extra } : {}) }, { status, headers })

const clientIp = (req: PayloadRequest): string =>
  req.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

const limitByIp = (
  limiter: ReturnType<typeof rateLimit>,
  req: PayloadRequest,
): Response | null => {
  const result = limiter.check(clientIp(req))
  if (result.ok) return null
  return bad(429, 'rate limit exceeded', { retryAfterMs: result.retryAfterMs }, {
    'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
  })
}

/** Route ids are numeric on SQLite but may be uuid strings on other adapters. */
const coerceDocId = (id: unknown): string | number => {
  const raw = String(id)
  return /^\d+$/.test(raw) ? Number(raw) : raw
}

export const cartAddBuildEndpoint: Endpoint = {
  path: '/:id/add-build',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const limited = limitByIp(addBuildLimiter, req)
    if (limited) return limited
    const cartID = req.routeParams?.id
    if (!cartID) return bad(400, 'cart ID required')
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid build line', parsed.error.flatten())
    const buildId = /^\d+$/.test(parsed.data.configuredBuild) ? Number(parsed.data.configuredBuild) : parsed.data.configuredBuild
    const subItems = (parsed.data.subItems ?? []).map((s) => ({
      ...s,
      component: /^\d+$/.test(s.component) ? Number(s.component) : s.component,
    }))
    try {
      const result = await addItem({
        // Typed as the app's DB id (number on SQLite); runtime also accepts
        // string ids so a future non-numeric adapter keeps working.
        cartID: coerceDocId(cartID) as number,
        cartItemMatcher,
        cartsSlug: 'carts',
        item: {
          lineType: 'configured-build',
          configuredBuild: buildId,
          buildName: parsed.data.buildName ?? 'Configured build',
          subItems,
        } as never,
        payload: req.payload,
        quantity: 1,
        req,
        secret: parsed.data.secret,
      })
      if (!result.success) return bad(404, result.message ?? 'cart not found')
      return ok(result)
    } catch (e) {
      // resolveLine threw — build missing or no longer compatible (APIError
      // with a user-facing reason); anything else is unexpected: log it and
      // return a generic 500 instead of leaking driver/internal messages.
      const status = (e as { status?: number })?.status
      if (typeof status === 'number' && status < 500 && e instanceof Error) {
        return bad(status, e.message)
      }
      console.error('[add-build] failed:', e)
      return bad(500, 'could not add build to cart')
    }
  },
}

type ValidateCartItem = { lineType?: string; [key: string]: unknown }

export const cartValidateBuildsEndpoint: Endpoint = {
  path: '/:id/validate',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const limited = limitByIp(validateLimiter, req)
    if (limited) return limited
    const cartID = req.routeParams?.id
    if (!cartID) return bad(400, 'cart ID required')
    let body: unknown = {}
    try {
      body = (await req.json?.()) ?? {}
    } catch {
      body = {}
    }
    const parsed = validateSchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid body', parsed.error.flatten())

    let cart: { id: string | number; customer?: unknown; secret?: string | null; items?: ValidateCartItem[] } | null
    try {
      cart = (await req.payload.findByID({
        collection: 'carts',
        id: coerceDocId(cartID),
        depth: 0,
        overrideAccess: true,
      })) as typeof cart
    } catch {
      cart = null
    }
    if (!cart) return bad(404, 'cart not found')
    const customer = cart.customer && typeof cart.customer === 'object' ? (cart.customer as { id: unknown }).id : cart.customer
    const isOwner = Boolean(req.user && customer !== undefined && customer !== null && String(customer) === String(req.user.id))
    const hasSecret = Boolean(parsed.data.secret && cart.secret && parsed.data.secret === cart.secret)
    if (!isOwner && !hasSecret) return bad(404, 'cart not found')

    const items = Array.isArray(cart.items) ? cart.items : []
    const reasons = await collectBuildIssues(items, req)
    if (reasons.length > 0) return Response.json({ error: 'build validation failed', reasons }, { status: 422 })
    const checked = items.filter((i) => i.lineType === 'configured-build').length
    return ok({ ok: true, checked })
  },
}

const discountBodySchema = z.object({
  code: z.string().min(1).max(60),
  subtotal: z.number().min(0).max(100_000_000).optional(),
  secret: z.string().optional(),
})

const shippingCountrySchema = z.object({
  // '' clears it; otherwise ISO 3166-1 alpha-2 (case-insensitive).
  country: z.string().max(2),
  secret: z.string().optional(),
})

/** Case-sensitive exact match on the stored code, trimmed — codes are admin-defined. */
const findDiscountByCode = async (req: PayloadRequest, code: string) => {
  const result = await req.payload.find({
    collection: 'discount-codes' as never,
    where: { code: { equals: code } } as never,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return (result.docs[0] as Record<string, unknown> | undefined) ?? null
}

export const discountValidateEndpoint: Endpoint = {
  path: '/discounts/validate',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const limited = limitByIp(discountValidateLimiter, req)
    if (limited) return limited
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = discountBodySchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid body', parsed.error.flatten())
    let doc: Record<string, unknown> | null = null
    try {
      doc = await findDiscountByCode(req, parsed.data.code.trim())
    } catch {
      doc = null
    }
    // Same math the cart hook applies — one source of truth for the answer.
    const check = validateDiscount(doc as never, parsed.data.subtotal ?? 0)
    return ok({
      valid: check.valid,
      ...(check.reason ? { reason: check.reason } : {}),
      discountTotal: check.discountTotal,
      freeShipping: check.freeShipping,
    })
  },
}

export const cartApplyDiscountEndpoint: Endpoint = {
  path: '/:id/apply-discount',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const limited = limitByIp(discountApplyLimiter, req)
    if (limited) return limited
    const cartID = req.routeParams?.id
    if (!cartID) return bad(400, 'cart ID required')
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = discountBodySchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid body', parsed.error.flatten())

    let cart:
      | { id: string | number; customer?: unknown; secret?: string | null; subtotal?: number; discountCode?: unknown }
      | null
    try {
      cart = (await req.payload.findByID({
        collection: 'carts',
        id: coerceDocId(cartID),
        depth: 0,
        overrideAccess: true,
      })) as typeof cart
    } catch {
      cart = null
    }
    if (!cart) return bad(404, 'cart not found')
    const customer = cart.customer && typeof cart.customer === 'object' ? (cart.customer as { id: unknown }).id : cart.customer
    const isOwner = Boolean(req.user && customer !== undefined && customer !== null && String(customer) === String(req.user.id))
    const hasSecret = Boolean(parsed.data.secret && cart.secret && parsed.data.secret === cart.secret)
    if (!isOwner && !hasSecret) return bad(404, 'cart not found')

    let doc: Record<string, unknown> | null = null
    try {
      doc = await findDiscountByCode(req, parsed.data.code.trim())
    } catch {
      doc = null
    }
    const subtotal = typeof cart.subtotal === 'number' ? cart.subtotal : 0
    const check = validateDiscount(doc as never, subtotal)
    if (!check.valid) return bad(422, check.reason ?? 'discount code is not valid')

    // Only the relationship is written — the cart beforeChange hook recomputes
    // the four totals from live collection state (same computeCartTotals math).
    const updated = (await req.payload.update({
      collection: 'carts',
      id: cart.id,
      data: { discountCode: (doc as { id: unknown }).id } as never,
      req,
    })) as { discountTotal?: number; shippingTotal?: number; taxTotal?: number; total?: number } | null
    if (!updated) return bad(500, 'could not apply discount code')
    return ok({
      ok: true,
      totals: {
        discountTotal: updated.discountTotal ?? 0,
        shippingTotal: updated.shippingTotal ?? 0,
        taxTotal: updated.taxTotal ?? 0,
        total: updated.total ?? subtotal,
      },
    })
  },
}

/**
 * POST /api/carts/:id/shipping-country — sets the country the tax-rates match
 * uses (plan item C1). Owner-or-secret gated like the other cart mutations;
 * the beforeChange hook recomputes the totals, so this endpoint never writes
 * them. The same country is sent with `initiatePayment({additionalData})` so
 * the order + confirmation email carry the full address.
 */
export const cartShippingCountryEndpoint: Endpoint = {
  path: '/:id/shipping-country',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const limited = limitByIp(shippingLimiter, req)
    if (limited) return limited
    const cartID = req.routeParams?.id
    if (!cartID) return bad(400, 'cart ID required')
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = shippingCountrySchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid body', parsed.error.flatten())
    const raw = parsed.data.country.trim()
    if (raw && !/^[A-Za-z]{2}$/.test(raw)) {
      return bad(400, 'country must be a two-letter ISO code (e.g. DE)')
    }
    const country = raw.toUpperCase()

    let cart:
      | { id: string | number; customer?: unknown; secret?: string | null; subtotal?: number }
      | null
    try {
      cart = (await req.payload.findByID({
        collection: 'carts',
        id: coerceDocId(cartID),
        depth: 0,
        overrideAccess: true,
      })) as typeof cart
    } catch {
      cart = null
    }
    if (!cart) return bad(404, 'cart not found')
    const customer = cart.customer && typeof cart.customer === 'object' ? (cart.customer as { id: unknown }).id : cart.customer
    const isOwner = Boolean(req.user && customer !== undefined && customer !== null && String(customer) === String(req.user.id))
    const hasSecret = Boolean(parsed.data.secret && cart.secret && parsed.data.secret === cart.secret)
    if (!isOwner && !hasSecret) return bad(404, 'cart not found')

    const updated = (await req.payload.update({
      collection: 'carts',
      id: cart.id,
      data: { shippingCountry: country } as never,
      req,
    })) as { discountTotal?: number; shippingTotal?: number; taxTotal?: number; total?: number } | null
    if (!updated) return bad(500, 'could not set shipping country')
    return ok({
      ok: true,
      country,
      totals: {
        discountTotal: updated.discountTotal ?? 0,
        shippingTotal: updated.shippingTotal ?? 0,
        taxTotal: updated.taxTotal ?? 0,
        total: updated.total ?? (typeof cart.subtotal === 'number' ? cart.subtotal : 0),
      },
    })
  },
}

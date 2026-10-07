import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'
import { addItem } from '@payloadcms/plugin-ecommerce'
import { rateLimit } from '@buildmyrig/lib'
import { cartItemMatcher, collectBuildIssues } from './lib/line-item-hooks.ts'
import { findEnabledPackagingTier } from './lib/packaging.ts'
import { validateDiscount, type DiscountCodeDoc } from './lib/pricing.ts'
import { claimSettlement, settleClaimedTransaction } from './lib/settle-transaction.ts'

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
const packagingLimiter = rateLimit({ windowMs: 60_000, max: 20 })
const confirmFreeLimiter = rateLimit({ windowMs: 60_000, max: 10 })

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

const packagingSchema = z.object({
  // tier id (packaging-tiers global row id) or null to clear.
  tier: z.string().min(1).max(40).nullable(),
  secret: z.string().optional(),
})

/**
 * POST /api/carts/:id/packaging — set/clear the packaging-upgrade line
 * (entry 71, Nexus checkout). Owner-or-secret gated like the other cart
 * mutations; the cart beforeChange hook resolves the tier price server-side
 * and recomputes totals — the endpoint never writes a price.
 */
export const cartPackagingEndpoint: Endpoint = {
  path: '/:id/packaging',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const limited = limitByIp(packagingLimiter, req)
    if (limited) return limited
    const cartID = req.routeParams?.id
    if (!cartID) return bad(400, 'cart ID required')
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = packagingSchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid body', parsed.error.flatten())

    let cart:
      | {
          id: string | number
          customer?: unknown
          secret?: string | null
          subtotal?: number
          items?: Array<Record<string, unknown>>
        }
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

    const items = Array.isArray(cart.items) ? cart.items : []
    const nonPackaging = items.filter(
      (i) => (i as { lineType?: string }).lineType !== 'packaging',
    )
    const tierId = parsed.data.tier
    let nextItems: Array<Record<string, unknown>> = nonPackaging
    if (tierId !== null) {
      if (nonPackaging.length === 0) return bad(422, 'cart is empty')
      const tier = await findEnabledPackagingTier(req.payload, tierId)
      if (!tier) return bad(422, 'packaging tier is not available')
      nextItems = [
        ...nonPackaging,
        {
          lineType: 'packaging',
          packagingTier: tier.id,
          lineLabel: tier.name,
          quantity: 1,
        },
      ]
    }
    const updated = (await req.payload.update({
      collection: 'carts',
      id: cart.id,
      data: { items: nextItems } as never,
      req,
    })) as { discountTotal?: number; shippingTotal?: number; taxTotal?: number; total?: number } | null
    if (!updated) return bad(500, 'could not update packaging')
    return ok({
      ok: true,
      tier: tierId,
      totals: {
        discountTotal: updated.discountTotal ?? 0,
        shippingTotal: updated.shippingTotal ?? 0,
        taxTotal: updated.taxTotal ?? 0,
        total: updated.total ?? (typeof cart.subtotal === 'number' ? cart.subtotal : 0),
      },
    })
  },
}

const confirmFreeSchema = z.object({
  secret: z.string().optional(),
  customerEmail: z.string().min(3).max(320),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
})

/** Relationship fields arrive as raw ids or populated objects — normalize both. */
const orderIdOf = (v: unknown): unknown =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v

/**
 * POST /api/carts/:id/confirm-free — the non-Stripe confirm path for carts
 * whose server-computed total is €0 (Round D). Stripe rejects €0
 * PaymentIntents, so without this a fully-discounted cart could never become
 * an order. Same settlement core as the Stripe webhook (`lib/settle-transaction`)
 * — CAS claim + fencing token + resumable decrement — keyed `free:<txId>` so
 * reservation conversion simply no-ops (no hold is ever created).
 *
 * Idempotency: the cart's `purchasedAt` CAS is the once-only gate. A lost
 * claim falls through to the cart's existing transaction — settled → return
 * its order (replay); pending → resume settling it (crash recovery). A
 * settled Stripe payment on the same cart also surfaces here as a replay.
 */
export const cartConfirmFreeEndpoint: Endpoint = {
  path: '/:id/confirm-free',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const limited = limitByIp(confirmFreeLimiter, req)
    if (limited) return limited
    const cartID = req.routeParams?.id
    if (!cartID) return bad(400, 'cart ID required')
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = confirmFreeSchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid body', parsed.error.flatten())

    let cart:
      | {
          id: string | number
          customer?: unknown
          secret?: string | null
          items?: Record<string, unknown>[]
          total?: number
          subtotal?: number
          discountCode?: unknown
          purchasedAt?: string | null
        }
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

    const items = Array.isArray(cart.items) ? cart.items : []
    if (items.length === 0) return bad(422, 'cart is empty')
    // The client never sets this number — the cart beforeChange hook does.
    if (!(typeof cart.total === 'number' && cart.total <= 0)) {
      return bad(422, 'cart total is not free — use the payment flow')
    }
    const reasons = await collectBuildIssues(items, req)
    if (reasons.length > 0) return Response.json({ error: 'build validation failed', reasons }, { status: 422 })

    // Mirror the upstream initiatePayment flatten: relationship fields to ids,
    // custom properties (lineType/configuredBuild/subItems/buildName) preserved.
    const flattenedItems = items.map((item) => {
      const { product, variant, ...rest } = item as Record<string, unknown>
      const productID = product && typeof product === 'object' ? (product as { id: unknown }).id : product
      const variantID = variant
        ? typeof variant === 'object'
          ? (variant as { id: unknown }).id
          : variant
        : undefined
      return {
        ...rest,
        product: productID,
        quantity: item.quantity,
        ...(variantID !== undefined ? { variant: variantID } : {}),
      }
    })

    // Confirm-time discount re-check (entry-57 security review, SEC-001):
    // `validateDiscount` runs at apply time only, and settlement's maxUses CAS
    // stops the *counter* overshooting while still settling the order — so N
    // carts pre-loaded with the same limited-use code could each land at €0.
    // Re-validate here, before any state change, so a doomed attempt never
    // claims the cart. Skipped once the cart is already purchased: replay and
    // crash-resume must not be blocked (the claim is committed by then).
    if (!cart.purchasedAt && cart.discountCode) {
      const codeID =
        typeof cart.discountCode === 'object'
          ? (cart.discountCode as { id: unknown }).id
          : cart.discountCode
      const code = (await req.payload
        .findByID({
          collection: 'discount-codes',
          id: coerceDocId(codeID),
          depth: 0,
          overrideAccess: true,
          req,
        })
        .catch(() => null)) as DiscountCodeDoc | null
      const check = validateDiscount(code, typeof cart.subtotal === 'number' ? cart.subtotal : 0)
      if (!check.valid) {
        return bad(422, `discount code no longer valid — ${String(check.reason)}`)
      }
    }

    // Once-only cart claim: the first concurrent request wins; losers fall
    // through to the transaction-resume path below. The stamp is kept so a
    // failed transaction-create can roll the claim back instead of wedging
    // the cart as 'purchased' with no transaction behind it.
    const purchaseStamp = new Date().toISOString()
    const claimed = await req.payload.db.updateOne({
      collection: 'carts',
      data: { purchasedAt: purchaseStamp },
      options: { atomic: true },
      req,
      where: {
        and: [{ id: { equals: cart.id } }, { purchasedAt: { exists: false } }],
      },
    } as never)

    let transaction: Record<string, any> | null = null
    if (!claimed) {
      // Lost the claim — the winner may still be creating its transaction, so
      // give it a bounded moment (same cadence as the webhook's lost-claim
      // wait) before reporting the cart as purchased.
      for (let attempt = 0; attempt < 4 && !transaction; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 250))
        const found = await req.payload.find({
          collection: 'transactions',
          where: { cart: { equals: cart.id } } as never,
          sort: '-createdAt',
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        transaction = (found.docs[0] as Record<string, any> | undefined) ?? null
      }
      if (!transaction) return bad(409, 'cart already purchased')
      if (transaction.order) {
        return ok({ ok: true, orderId: orderIdOf(transaction.order), alreadyConfirmed: true })
      }
    }

    try {
      if (claimed) {
        transaction = (await req.payload.create({
          collection: 'transactions',
          data: {
            // Mirrors the Stripe adapter's initiatePayment shape minus the
            // Stripe group; `paymentProvider` marks the non-adapter path.
            ...(req.user ? { customer: req.user.id } : { customerEmail: parsed.data.customerEmail }),
            amount: 0,
            cart: cart.id,
            currency: 'EUR',
            items: flattenedItems,
            paymentProvider: 'free',
            status: 'pending',
          } as never,
          overrideAccess: true,
          req,
        })) as Record<string, any>
      }
      // Non-null here: `claimed` just created it; a lost claim already
      // early-returned on null above.
      const tx = transaction as Record<string, any>
      const claimToken = await claimSettlement(req.payload, req, tx.id)
      if (!claimToken) {
        // A concurrent confirm owns the settlement — surface its order if it
        // already landed, otherwise tell the client to retry shortly.
        const latest = (await req.payload
          .findByID({
            collection: 'transactions',
            id: tx.id,
            depth: 0,
            overrideAccess: true,
            req,
          })
          .catch(() => null)) as Record<string, any> | null
        if (latest?.order) {
          return ok({ ok: true, orderId: orderIdOf(latest.order), alreadyConfirmed: true })
        }
        return bad(409, 'checkout already in progress — retry shortly')
      }
      const settled = await settleClaimedTransaction({
        payload: req.payload,
        req,
        transaction: tx,
        claimToken,
        amount: 0,
        currency: 'EUR',
        items:
          Array.isArray(tx.items) && tx.items.length > 0
            ? (tx.items as Record<string, unknown>[])
            : flattenedItems,
        shippingAddress: parsed.data.shippingAddress,
        paymentKey: `free:${String(tx.id)}`,
      })
      if (!settled) return bad(409, 'checkout already in progress — retry shortly')
      return ok({ ok: true, orderId: settled.orderId, alreadyConfirmed: false })
    } catch (err) {
      if (claimed && !transaction) {
        // The transaction itself never landed — release the cart claim (only
        // if it still carries our stamp, so a later settler isn't unclaimed).
        await req.payload.db
          .updateOne({
            collection: 'carts',
            data: { purchasedAt: null },
            req,
            where: {
              and: [{ id: { equals: cart.id } }, { purchasedAt: { equals: purchaseStamp } }],
            },
          } as never)
          .catch(() => null)
      }
      // Settlement stays resumable: the cart is claimed, the transaction is
      // 'processing' with its fencing token — a retry resumes or the stale
      // window (>60s) re-claims it.
      req.payload.logger.error(
        `[confirm-free] settlement failed for cart ${String(cartID)}: ${String(err)} — retry will resume`,
      )
      return bad(500, 'could not confirm the order — retry shortly')
    }
  },
}

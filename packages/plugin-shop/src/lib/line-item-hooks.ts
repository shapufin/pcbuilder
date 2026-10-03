import type { Field, PayloadRequest } from 'payload'
import { getLineItemType } from '@buildmyrig/lib'
import {
  computeCartTotals,
  validateDiscount,
  type DiscountCodeDoc,
  type ShippingBand,
  type TaxRateRow,
} from './pricing.ts'
import { heldQuantities } from './reservations.ts'

/**
 * Composite line-item support for the ecommerce plugin's carts/orders
 * (docs/buildmyrig-plan/05-plugin-contracts.md — the registry is the only
 * shop ↔ builder bridge; this file never imports builder code).
 *
 * Carts: items gain lineType / configuredBuild / buildName / subItems fields.
 * Orders: same fields (order items are created from the cart snapshot, which
 * carries the custom properties through).
 */

const compositeItemFields: Field[] = [
  {
    name: 'lineType',
    type: 'select',
    options: ['standard', 'configured-build'],
    defaultValue: 'standard',
  },
  {
    name: 'configuredBuild',
    type: 'relationship',
    relationTo: 'configured-builds' as never,
    admin: { hidden: true },
  },
  { name: 'buildName', type: 'text', admin: { hidden: true } },
  {
    name: 'subItems',
    type: 'array',
    admin: { hidden: true },
    fields: [
      { name: 'component', type: 'relationship', relationTo: 'components' as never },
      { name: 'quantity', type: 'number', defaultValue: 1 },
      { name: 'name', type: 'text' },
    ],
  },
]

/** Deep-extends every 'items' array field (carts: top-level, orders: inside tabs). */
export const extendItemsFields = (fields: Field[]): Field[] =>
  fields.map((field) => {
    if (field.type === 'array' && field.name === 'items') {
      return { ...field, fields: [...field.fields, ...compositeItemFields] }
    }
    if (field.type === 'tabs') {
      return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: extendItemsFields(tab.fields) })) }
    }
    if (field.type === 'group') {
      return { ...field, fields: extendItemsFields(field.fields) }
    }
    return field
  })

type CartItem = {
  lineType?: string
  configuredBuild?: unknown
  quantity?: number
  [key: string]: unknown
}

type HookData = {
  items?: CartItem[]
  subtotal?: number
  discountCode?: unknown
  discountTotal?: number
  shippingTotal?: number
  taxTotal?: number
  total?: number
  [key: string]: unknown
}

/**
 * Cart-level commerce fields (04-collections/commerce.md row 27): the code
 * applied by the shopper plus the four server-computed totals. `total` is
 * what Stripe charges — the patched initiatePayment reads it (falls back to
 * subtotal when absent). All are write-locked at the field-access level
 * (entry 44 review): values only ever come from `wrapCartBeforeChange` or
 * `overrideAccess` endpoint writes.
 */
const serverWritten = { access: { create: () => false, update: () => false } } as const

export const cartTotalsFields: Field[] = [
  {
    name: 'discountCode',
    type: 'relationship',
    relationTo: 'discount-codes' as never,
    ...serverWritten,
    admin: { readOnly: true, description: 'Set via /api/carts/:id/apply-discount only' },
  },
  {
    name: 'shippingCountry',
    type: 'text',
    ...serverWritten,
    admin: {
      readOnly: true,
      description:
        'ISO-3166 alpha-2, set via /api/carts/:id/shipping-country — drives the tax-rates match (plan item C1)',
    },
  },
  { name: 'discountTotal', type: 'number', defaultValue: 0, ...serverWritten, admin: { readOnly: true } },
  { name: 'shippingTotal', type: 'number', defaultValue: 0, ...serverWritten, admin: { readOnly: true } },
  { name: 'taxTotal', type: 'number', defaultValue: 0, ...serverWritten, admin: { readOnly: true } },
  { name: 'total', type: 'number', ...serverWritten, admin: { readOnly: true, description: 'Charged amount: subtotal - discount + shipping (VAT-inclusive)' } },
]

/** Relationship fields arrive as raw ids or populated objects — normalize both. */
const relId = (v: unknown): string | number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'object' && 'id' in v) return (v as { id: string | number }).id
  return v as string | number
}

/**
 * Recompute the cart's discount/shipping/tax/total from live collection
 * state. Runs on every cart write (add/remove/merge/apply-discount) so the
 * numbers Stripe charges are always server-derived. Fails open to zeroed
 * totals with a warn — a totals hiccup must not break cart writes.
 */
const recomputeCartTotals = async (data: HookData, req: PayloadRequest): Promise<void> => {
  const subtotal = typeof data.subtotal === 'number' ? data.subtotal : 0
  try {
    const discountId = relId(data.discountCode)
    const [discountDoc, bands, rates] = await Promise.all([
      discountId === null
        ? Promise.resolve(null)
        : req.payload
            .findByID({ collection: 'discount-codes' as never, id: discountId, depth: 0, overrideAccess: true, req })
            .catch(() => null),
      req.payload.find({
        collection: 'shipping-bands' as never,
        where: { enabled: { equals: true } },
        limit: 100,
        depth: 0,
        overrideAccess: true,
        req,
      }),
      req.payload.find({
        collection: 'tax-rates' as never,
        where: { enabled: { equals: true } },
        limit: 100,
        depth: 0,
        overrideAccess: true,
        req,
      }),
    ])
    const totals = computeCartTotals({
      subtotal,
      discountCode: discountDoc as DiscountCodeDoc | null,
      shippingBands: bands.docs as unknown as ShippingBand[],
      taxRates: rates.docs as unknown as TaxRateRow[],
      // Country collected at checkout (plan item C1) — falls back to the
      // isDefault tax row when absent/unknown.
      country: typeof data.shippingCountry === 'string' ? data.shippingCountry : null,
    })
    // A code that no longer validates (expired, exhausted, misconfigured —
    // any type) clears itself so a stale cart can't carry a dead discount
    // into checkout. Validity, not the rounded amount, is the signal: a
    // valid code that merely discounts €0 stays.
    if (discountDoc && !validateDiscount(discountDoc as DiscountCodeDoc, subtotal).valid) {
      data.discountCode = null
    }
    data.discountTotal = totals.discountTotal
    data.shippingTotal = totals.shippingTotal
    data.taxTotal = totals.taxTotal
    data.total = totals.total
  } catch (err) {
    // Logger itself can be absent (bare test doubles, early boot) — the
    // fail-open contract must hold even when reporting fails.
    req.payload.logger?.warn?.(`[cart-totals] recompute failed, zeroing totals: ${String(err)}`)
    data.discountTotal = 0
    data.shippingTotal = 0
    data.taxTotal = 0
    data.total = subtotal
  }
}

export type CartBeforeChangeHook = (args: {
  data: HookData
  req: PayloadRequest
  operation?: string
  [key: string]: unknown
}) => Promise<void> | void

/**
 * Wraps the ecommerce plugin's default cart beforeChange (beforeChangeCart):
 * it crashes on product-less items — composite lines have no product/variant.
 * Standard items are delegated to the default hook untouched (subtotal from
 * variant prices + guest-secret generation); composite items are resolved via
 * the registered line types and their server-side prices added to the subtotal.
 * Unknown slugs are priced as standard (safe default per the extension contract).
 */
/**
 * A10: clamp every line's quantity to available stock — this hook runs on
 * guest→user merges too, so merged carts can't overbook. Available stock is
 * on-hand inventory MINUS active reservations (audit gap P2-C6: holds at
 * payment initiation), so two carts can't both reserve the last unit.
 * Untracked stock (null inventory) is not capped. Only standard lines are
 * capped here; composite lines re-validate at checkout/order time.
 * Reservation lookup fails open to raw inventory (missing collection, old DB).
 */
const capQuantitiesToStock = async (items: CartItem[], req: PayloadRequest): Promise<void> => {
  // C4: scope the availability read to the cart's own SKUs so it stays
  // bounded no matter how many carts are mid-checkout.
  const variantIds: Array<string | number> = []
  const productIds: Array<string | number> = []
  for (const item of items) {
    if (item.lineType && item.lineType !== 'standard') continue
    const variantId = relId(item.variant)
    const productId = relId(item.product)
    if (variantId !== null) variantIds.push(variantId)
    else if (productId !== null) productIds.push(productId)
  }
  let held: Map<string, number> | null = null
  try {
    held = await heldQuantities(req.payload, req, { variantIds, productIds })
  } catch {
    held = null // no reservations collection (legacy DB) — raw inventory is the cap
  }
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (item.lineType && item.lineType !== 'standard') continue
    const qty = item.quantity
    if (typeof qty !== 'number' || qty <= 0) continue
    const variantId = relId(item.variant)
    const productId = relId(item.product)
    const target = variantId ?? productId
    if (target === null) continue
    try {
      const doc = (await req.payload.findByID({
        collection: (variantId ? 'variants' : 'products') as never,
        id: target,
        depth: 0,
        overrideAccess: true,
        req,
      })) as { inventory?: number | null }
      const stock = doc?.inventory
      if (typeof stock === 'number' && Number.isFinite(stock)) {
        const reserved = held?.get(`${variantId ? 'variant' : 'product'}:${String(target)}`) ?? 0
        const available = Math.max(0, stock - reserved)
        // Fully reserved stock drops the line entirely — a `quantity: 0`
        // row would fail validation or sit as a dead line.
        if (qty > available) {
          if (available === 0) items.splice(i, 1)
          else item.quantity = available
        }
      }
    } catch {
      // Missing/deleted product — leave the line; checkout validation catches it.
    }
  }
}

export const wrapCartBeforeChange =
  (defaultHook: CartBeforeChangeHook) =>
  async (args: { data: HookData; req: PayloadRequest; operation?: string }) => {
    const items = args.data?.items
    if (Array.isArray(items)) await capQuantitiesToStock(items, args.req)
    const hasComposite = Array.isArray(items) && items.some((i) => i.lineType && i.lineType !== 'standard')
    if (!hasComposite) {
      await defaultHook(args)
      await recomputeCartTotals(args.data, args.req)
      return
    }
    const standard = items!.filter((i) => !i.lineType || i.lineType === 'standard')
    const composite = items!.filter((i) => i.lineType && i.lineType !== 'standard')
    args.data.items = standard
    await defaultHook(args)
    args.data.items = [...standard, ...composite]
    let extra = 0
    for (const item of composite) {
      const type = getLineItemType(item.lineType!)
      if (!type) continue
      const resolved = await type.resolveLine(item, args.req.payload)
      extra += resolved.price * (item.quantity ?? 1)
    }
    args.data.subtotal = (args.data.subtotal ?? 0) + extra
    await recomputeCartTotals(args.data, args.req)
  }

/**
 * Orders beforeChange — the checkout gate (06-rule-engine.md step 2):
 * re-validates every configured-build line via the registered resolveLine,
 * which throws with per-slot reasons on a missing/incompatible build and
 * re-resolves the price from live variant prices (a tampered priceSnapshot
 * is overwritten, never trusted).
 *
 * Create-only: webhook/status updates re-run this hook and would rewrite
 * configured-build snapshots for no reason.
 */
export const validateBuildsAtCheckout = async ({
  data,
  req,
  operation,
}: {
  data: HookData
  req: PayloadRequest
  operation?: string
}) => {
  if (operation && operation !== 'create') return
  if (!Array.isArray(data.items)) return
  for (const item of data.items) {
    if (item.lineType !== 'configured-build') continue
    const type = getLineItemType('configured-build')
    if (!type) continue
    await type.resolveLine(item, req.payload)
  }
}

/**
 * Aggregates per-line reasons instead of throwing on the first one — used by
 * POST /api/carts/:id/validate so the checkout page can show everything that
 * broke (confirmOrder swallows hook errors into a generic 500).
 */
export const collectBuildIssues = async (
  items: CartItem[],
  req: PayloadRequest,
): Promise<string[]> => {
  const reasons: string[] = []
  for (const item of items) {
    if (item.lineType !== 'configured-build') continue
    const type = getLineItemType('configured-build')
    if (!type) continue
    try {
      await type.resolveLine(item, req.payload)
    } catch (e) {
      reasons.push(e instanceof Error ? e.message : 'build validation failed')
    }
  }
  return reasons
}

/** Relationship fields arrive as raw ids or populated objects — normalize both. */
const itemId = (v: unknown): unknown =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v

/**
 * Same product+variant+build → quantity merges instead of a duplicate line.
 * The configuredBuild term is what stops distinct builds colliding on
 * `product:null` during guest→user cart merges; idOf keeps it working when a
 * side arrives populated (merge passes docs, addItem passes raw ids).
 */
export const compositeCartItemMatcher =
  () =>
  ({ existingItem, newItem }: { existingItem: CartItem; newItem: CartItem }) =>
    itemId(existingItem.product) === itemId(newItem.product) &&
    itemId(existingItem.variant) === itemId(newItem.variant) &&
    itemId(existingItem.configuredBuild) === itemId(newItem.configuredBuild)

/** Singleton — shared by the ecommerce config and the add-build endpoint. */
export const cartItemMatcher = compositeCartItemMatcher()

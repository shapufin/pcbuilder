import type { Field, PayloadRequest } from 'payload'
import { getLineItemType } from '@buildmyrig/lib'

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
  [key: string]: unknown
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
export const wrapCartBeforeChange =
  (defaultHook: CartBeforeChangeHook) =>
  async (args: { data: HookData; req: PayloadRequest; operation?: string }) => {
    const items = args.data?.items
    const hasComposite = Array.isArray(items) && items.some((i) => i.lineType && i.lineType !== 'standard')
    if (!hasComposite) return defaultHook(args)
    const standard = items.filter((i) => !i.lineType || i.lineType === 'standard')
    const composite = items.filter((i) => i.lineType && i.lineType !== 'standard')
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

/** Same build twice → quantity merges instead of a duplicate line. */
export const compositeCartItemMatcher =
  () =>
  ({ existingItem, newItem }: { existingItem: CartItem; newItem: CartItem }) =>
    existingItem.product === newItem.product &&
    existingItem.variant === newItem.variant &&
    existingItem.configuredBuild === newItem.configuredBuild

/** Singleton — shared by the ecommerce config and the add-build endpoint. */
export const cartItemMatcher = compositeCartItemMatcher()

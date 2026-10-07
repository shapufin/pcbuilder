import type { Payload } from 'payload'
import { registerLineItemType } from '@buildmyrig/lib'

/**
 * Entry 71 (Nexus) — packaging tiers: the source app's mock `PACKAGING_TIERS`
 * become a real `packaging-tiers` global, priced server-side as a
 * `lineType:'packaging'` cart line. The line carries `packagingTier` (the
 * tier's stable text id) + `lineLabel` (display name); the price is NEVER
 * client-supplied — resolveLine re-reads the global on every cart write and
 * at order create, so a tampered or stale tier re-resolves or rejects.
 */

export type PackagingTier = {
  id: string
  name: string
  badge?: string
  description: string
  features: string[]
  priceCents: number
  enabled: boolean
}

export type PackagingTiers = { tiers: PackagingTier[] }

const TIER_ID = /^[a-z0-9][a-z0-9-]{0,39}$/

const cleanText = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

/**
 * Never throws: unknown doc shapes resolve to `{ tiers: [] }` so the
 * checkout picker simply renders nothing; a missing global (fresh DB) does
 * the same. `enabled === false` rows are kept in the resolved list (resolver
 * output is also used by resolveLine) — storefront code filters on enabled.
 */
export function resolvePackagingTiers(doc: unknown): PackagingTiers {
  const d = (doc ?? {}) as Record<string, unknown>
  if (!Array.isArray(d.tiers)) return { tiers: [] }
  const tiers: PackagingTier[] = []
  const seen = new Set<string>()
  for (const entry of d.tiers as Array<Record<string, unknown> | null | undefined>) {
    if (!entry || typeof entry !== 'object') continue
    const id = cleanText(entry.id, 40)
    const name = cleanText(entry.name, 80)
    if (!TIER_ID.test(id) || !name || seen.has(id)) continue
    seen.add(id)
    const priceCents =
      typeof entry.priceCents === 'number' && Number.isFinite(entry.priceCents)
        ? Math.max(0, Math.round(entry.priceCents))
        : 0
    const tier: PackagingTier = {
      id,
      name,
      description: cleanText(entry.description, 400),
      features: Array.isArray(entry.features)
        ? (entry.features as Array<{ text?: unknown } | null | undefined>)
            .map((f) => cleanText(typeof f === 'string' ? f : f?.text, 120))
            .filter(Boolean)
        : [],
      priceCents,
      enabled: entry.enabled !== false,
    }
    const badge = cleanText(entry.badge, 40)
    if (badge) tier.badge = badge
    tiers.push(tier)
  }
  return { tiers }
}

const tiersDoc = async (payload: Payload): Promise<PackagingTier[]> => {
  try {
    const doc = await payload.findGlobal({ slug: 'packaging-tiers', overrideAccess: true })
    return resolvePackagingTiers(doc).tiers
  } catch {
    return []
  }
}

/** Storefront-safe lookup: unknown/disabled/missing → undefined. */
export const findEnabledPackagingTier = async (
  payload: Payload,
  id: string,
): Promise<PackagingTier | undefined> =>
  (await tiersDoc(payload)).find((t) => t.id === id && t.enabled)

/**
 * Registers the 'packaging' composite line type. Called once from
 * shopPlugin at config time (same pattern as the builder's
 * 'configured-build' registration — the registry in @buildmyrig/lib is the
 * only bridge, this module never imports app code).
 *
 * resolveStockUnits returns [] — packaging consumes no inventory; without
 * it settle-transaction would warn on every settlement (gap register #5).
 */
export const registerPackagingLineType = (): void => {
  registerLineItemType({
    slug: 'packaging',
    label: 'Packaging tier',
    resolveLine: async (line, payload) => {
      const id = cleanText(line.packagingTier, 40)
      const tier = id ? await findEnabledPackagingTier(payload, id) : undefined
      if (!tier) {
        // Missing/deleted/disabled tier falls back gracefully to price 0 (default free tier)
        return { price: 0, subItems: [], fulfillmentUnits: 0 }
      }
      return { price: tier.priceCents, subItems: [], fulfillmentUnits: 0 }
    },
    resolveStockUnits: async () => [],
  })
}

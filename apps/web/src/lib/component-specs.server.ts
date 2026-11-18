import type { Payload } from 'payload'

/**
 * PDP spec fallback (entry 86): a component product inherits `specsJson`
 * from its linked builder component. Lookup order matches the original page
 * code — the variant-linked component wins (a product can carry several
 * sellable variants), then the product's own `component` relationship.
 *
 * The product arrives at depth 2, so a populated relationship is read for
 * free — the previous implementation re-fetched the product at depth 1 and
 * then the component again, costing up to two extra queries per render
 * (audit 2026-10-24).
 */
export const resolveComponentSpecs = async (
  product: { component?: unknown },
  variantIds: Array<string | number>,
  payload: Payload,
): Promise<Record<string, unknown> | null> => {
  try {
    if (variantIds.length > 0) {
      const res = await payload.find({
        collection: 'components',
        where: { productVariant: { in: variantIds } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const specs = (res.docs[0] as { specsJson?: Record<string, unknown> | null } | undefined)
        ?.specsJson
      if (specs) return specs
    }
    const rel = product.component
    if (rel && typeof rel === 'object') {
      return (rel as { specsJson?: Record<string, unknown> | null }).specsJson ?? null
    }
    if (typeof rel === 'number' || typeof rel === 'string') {
      const doc = (await payload.findByID({
        collection: 'components',
        id: rel,
        depth: 0,
        overrideAccess: true,
      })) as { specsJson?: Record<string, unknown> | null }
      return doc?.specsJson ?? null
    }
    return null
  } catch {
    return null // best-effort fallback — PDP renders without inherited specs
  }
}

import { getPayloadClient } from './shop'
import type { AttrTypeDoc, AttrValueDoc } from './facets'

export type FacetRegistries = {
  attributeTypes: AttrTypeDoc[]
  attributeValues: AttrValueDoc[]
  brands: Array<{ id: string | number; name: string; slug: string }>
}

/**
 * Facet registries for category pages (audit 2026-10-24): attribute-types,
 * attribute-values and brands are tiny admin-managed collections that were
 * re-fetched on every request — category pages read searchParams, so they
 * render dynamically and ISR can't cover them. Same single-instance TTL +
 * inflight-dedup pattern as the builder index / pricing config.
 */
const TTL_MS = 300_000

let cached: { data: FacetRegistries; storedAt: number } | null = null
let inflight: Promise<FacetRegistries> | null = null

export const invalidateFacetRegistries = (): void => {
  cached = null
}

export const getFacetRegistries = async (): Promise<FacetRegistries> => {
  if (cached && Date.now() - cached.storedAt < TTL_MS) return cached.data
  if (inflight) return inflight
  inflight = (async () => {
    const payload = await getPayloadClient()
    const [attributeTypes, attributeValues, brands] = await Promise.all([
      payload.find({ collection: 'attribute-types', limit: 50, sort: 'name' }),
      payload.find({ collection: 'attribute-values', limit: 200, sort: 'value' }),
      // Facet options come from the brands collection — a hardcoded slug list
      // silently renders dead filters the moment seed/admin data diverges.
      payload.find({ collection: 'brands', limit: 100, sort: 'name' }),
    ])
    const data: FacetRegistries = {
      attributeTypes: attributeTypes.docs as AttrTypeDoc[],
      attributeValues: attributeValues.docs as AttrValueDoc[],
      brands: brands.docs as FacetRegistries['brands'],
    }
    cached = { data, storedAt: Date.now() }
    return data
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

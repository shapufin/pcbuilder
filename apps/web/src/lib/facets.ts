import type { Where } from 'payload'

/**
 * Spec facets (entry 64). `attribute-types` defines the URL param slug +
 * display meta; `attribute-values` the options; products carry
 * `attributeValues[{attributeType, value}]`. Both helpers are pure so the
 * category page stays a thin query layer.
 */

export type FacetOption = { value: string; label: string; count: number }
export type Facet = { slug: string; name: string; unit?: string | null; options: FacetOption[] }

type Ref = number | string | { id: number | string } | null | undefined
export type AttrTypeDoc = { id: number | string; name: string; slug: string; unit?: string | null }
export type AttrValueDoc = {
  id: number | string
  value: string
  displayLabel?: string | null
  attributeType: Ref
}
type ProductAttrs = { attributeValues?: Array<{ attributeType?: Ref; value?: Ref }> | null }

/** Relationship fields arrive as ids at depth 0 and as objects at depth ≥1. */
const refId = (r: Ref): string | null => (r == null ? null : typeof r === 'object' ? String(r.id) : String(r))

/**
 * Per-value counts over the supplied products (the category's non-facet
 * filtered set — counts must not collapse when a facet itself is selected).
 * Types/options with zero matching products are dropped: a filter that can
 * only yield an empty grid is a dead end, not a feature.
 */
export function buildFacets(
  products: ProductAttrs[],
  types: AttrTypeDoc[],
  values: AttrValueDoc[],
): Facet[] {
  // typeId -> valueId -> product count (a product counts once per pair).
  const counts = new Map<string, Map<string, number>>()
  for (const p of products) {
    const seen = new Set<string>()
    for (const a of p.attributeValues ?? []) {
      const type = refId(a.attributeType)
      const value = refId(a.value)
      if (!type || !value) continue
      const key = `${type}:${value}`
      if (seen.has(key)) continue
      seen.add(key)
      const byValue = counts.get(type) ?? new Map<string, number>()
      byValue.set(value, (byValue.get(value) ?? 0) + 1)
      counts.set(type, byValue)
    }
  }

  const facets: Facet[] = []
  for (const type of types) {
    const byValue = counts.get(String(type.id))
    if (!byValue) continue
    const options: FacetOption[] = []
    for (const v of values) {
      if (refId(v.attributeType) !== String(type.id)) continue
      const count = byValue.get(String(v.id)) ?? 0
      if (count > 0) options.push({ value: v.value, label: v.displayLabel?.trim() || v.value, count })
    }
    if (options.length > 0) {
      facets.push({ slug: type.slug, name: type.name, unit: type.unit ?? null, options })
    }
  }
  return facets
}

/**
 * Resolve `?socket=AM5&wattage=750` against the registries. Only registered
 * slugs are read (the URL can't inject arbitrary keys), and an unknown value
 * is ignored rather than rendered as a filter that matches nothing.
 */
export function facetSelection(
  types: AttrTypeDoc[],
  values: AttrValueDoc[],
  searchParams: Record<string, string | string[] | undefined>,
): { active: Record<string, string>; where: Where[] } {
  const active: Record<string, string> = {}
  const where: Where[] = []
  for (const type of types) {
    const raw = searchParams[type.slug]
    const wanted = Array.isArray(raw) ? raw[0] : raw
    if (!wanted) continue
    const match = values.find(
      (v) => refId(v.attributeType) === String(type.id) && v.value === wanted,
    )
    if (!match) continue
    active[type.slug] = wanted
    // Payload rejects `elemMatch` on this array ("path cannot be queried");
    // the supported shape is dotted subfield paths. Matching type and value
    // independently is equivalent here — an attribute value id belongs to
    // exactly one type, so a cross-element match is impossible.
    where.push({
      and: [
        { 'attributeValues.attributeType': { equals: type.id } },
        { 'attributeValues.value': { equals: match.id } },
      ],
    } as Where)
  }
  return { active, where }
}

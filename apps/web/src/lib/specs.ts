export type SpecRow = { key: string; value: string }
export type CompatRow = { name: string; value: string }

/**
 * PDP compatibility list (entry 64). Products carry
 * `attributeValues[{attributeType, value}]`; at depth ≥2 both sides are
 * populated docs. Unresolved ids are skipped rather than printed as numbers —
 * a compatibility list showing "1" is worse than an absent one.
 */
export function compatRows(attributeValues: unknown): CompatRow[] {
  if (!Array.isArray(attributeValues)) return []
  const rows: CompatRow[] = []
  for (const entry of attributeValues) {
    if (typeof entry !== 'object' || entry === null) continue
    const { attributeType, value } = entry as { attributeType?: unknown; value?: unknown }
    if (typeof attributeType !== 'object' || attributeType === null) continue
    if (typeof value !== 'object' || value === null) continue
    const name = (attributeType as { name?: unknown }).name
    const label = (value as { displayLabel?: unknown }).displayLabel
    const raw = (value as { value?: unknown }).value
    const text =
      typeof label === 'string' && label.trim()
        ? label.trim()
        : typeof raw === 'string' && raw.trim()
          ? raw
          : null
    if (typeof name !== 'string' || !name.trim() || !text) continue
    rows.push({ name, value: text })
  }
  return rows
}

/** One array element rendered inline: objects become "k: v" pairs. */
const leaf = (v: unknown): string => {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object' && !Array.isArray(v)) {
    const entries = Object.entries(v as Record<string, unknown>)
    return entries.length === 0 ? '—' : entries.map(([k, val]) => `${k}: ${leaf(val)}`).join(', ')
  }
  return Array.isArray(v) ? v.map(leaf).join(', ') : String(v)
}

/**
 * specsJson → flat display rows for the PDP spec table (entry 61).
 * Nested objects flatten to dot-path keys (`dimensions.lengthMm`);
 * arrays join items — `, ` for all-primitive lists, `; ` once an object
 * element is involved so item boundaries stay legible; null/empty → `—`.
 */
export function specRows(specs: Record<string, unknown> | null | undefined): SpecRow[] {
  if (!specs || typeof specs !== 'object') return []
  const rows: SpecRow[] = []
  const walk = (prefix: string, value: unknown) => {
    if (value === null || value === undefined) {
      rows.push({ key: prefix, value: '—' })
    } else if (Array.isArray(value)) {
      const hasObjects = value.some((v) => typeof v === 'object' && v !== null)
      rows.push({ key: prefix, value: value.map(leaf).join(hasObjects ? '; ' : ', ') })
    } else if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) rows.push({ key: prefix, value: '—' })
      else for (const [k, v] of entries) walk(`${prefix}.${k}`, v)
    } else {
      rows.push({ key: prefix, value: String(value) })
    }
  }
  for (const [k, v] of Object.entries(specs)) walk(k, v)
  return rows
}

/**
 * specRows minus a top-level key set — entry 71 Nexus PDP renders marketing
 * meta (spScore, goldenBin, features…) as chips/badges, so those keys are
 * filtered out of the generic table instead of double-rendering as raw rows.
 */
export function specRowsExcept(
  specs: Record<string, unknown> | null | undefined,
  exclude: ReadonlySet<string>,
): SpecRow[] {
  return specRows(specs).filter((row) => !exclude.has(row.key.split('.')[0]!))
}

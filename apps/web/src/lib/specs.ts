export type SpecRow = { key: string; value: string }

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

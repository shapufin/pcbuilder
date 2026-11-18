/**
 * Mojibake repair for seeded content.
 *
 * Windows editors that write UTF-8 as CP1252 (or a double decode) turn an em
 * dash, a euro sign or a curly quote into a three-byte sequence that renders as
 * garbage, and accented letters into a two-byte one. The homepage copy shipped
 * with four such strings (audit 2026-10-22, #677) — the source files were
 * clean, so the damage came in through the seed write path. Every seed write
 * now passes through `repairMojibake`, and `hasMojibake` gives tests a cheap
 * guard.
 */

const REPLACEMENTS: [RegExp, string][] = [
  // em dash / en dash / ellipsis (the classic CP1252 triplets)
  [/\u00e2\u20ac\u201d/g, '\u2014'],
  [/\u00e2\u20ac\u201c/g, '\u2013'],
  [/\u00e2\u20ac\u00a6/g, '\u2026'],
  // euro / pound / yen signs
  [/\u00e2\u201a\u00ac/g, '\u20ac'],
  [/\u00c2\u00a3/g, '\u00a3'],
  [/\u00c2\u00a5/g, '\u00a5'],
  // curly quotes
  [/\u00e2\u20ac\u2122/g, '\u2019'],
  [/\u00e2\u20ac\u02dc/g, '\u2018'],
  [/\u00e2\u20ac\u0153/g, '\u201c'],
  [/\u00e2\u20ac\u009d/g, '\u201d'],
  // Latin-1 accents
  [/\u00c3\u00a9/g, '\u00e9'],
  [/\u00c3\u00a8/g, '\u00e8'],
  [/\u00c3\u00bc/g, '\u00fc'],
  [/\u00c3\u00b6/g, '\u00f6'],
  [/\u00c3\u00a4/g, '\u00e4'],
  [/\u00c3\u009f/g, '\u00df'],
  // non-breaking space
  [/\u00c2\u00a0/g, '\u00a0'],
]

/** Markers that only appear when UTF-8 was decoded as CP1252. */
const MARKER = /\u00e2[\u201a\u20ac]|\u00c3[\u00a0-\u00bf]|\u00c2[\u00a0-\u00bf]/

export const repairMojibake = <T>(value: T): T => {
  if (typeof value === 'string') {
    let out: string = value
    for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement)
    return out as unknown as T
  }
  if (Array.isArray(value)) return value.map((item) => repairMojibake(item)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = repairMojibake(nested)
    }
    return out as unknown as T
  }
  return value
}

export const hasMojibake = (value: unknown): boolean => {
  if (typeof value === 'string') return MARKER.test(value)
  if (Array.isArray(value)) return value.some((item) => hasMojibake(item))
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((nested) => hasMojibake(nested))
  }
  return false
}

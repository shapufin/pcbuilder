const MAX_QUERY_LENGTH = 100

/**
 * Normalise a user-supplied search string for a payload `contains` filter
 * (entry 18, Step A). The adapter parameterises the query (no SQL injection)
 * but `%`, `_` and `\` are LIKE metacharacters — `%` alone would match every row.
 * Returns null when nothing searchable remains (route shows its empty state).
 */
export function sanitizeSearchQuery(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[%_\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
  return cleaned.length > 0 ? cleaned : null
}

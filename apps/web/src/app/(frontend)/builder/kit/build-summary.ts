import type { BuilderIndex, ComponentSpecEntry, Selections } from '@buildmyrig/lib'

type Category = BuilderIndex['categories'][number]

export type BuildSummary = {
  categories: Category[]
  rows: { category: Category; entry: ComponentSpecEntry | undefined }[]
  total: number
  missing: Category[]
}

/**
 * Summary table data for a selection set (audit 2026-11-18 R3): categories in
 * sort order, one row per selected id (unknown ids keep a row with no entry so
 * the UI can flag them), the price total, and required slots left empty.
 */
export const summarizeBuild = (index: BuilderIndex | null | undefined, selections: Selections): BuildSummary => {
  if (!index) return { categories: [], rows: [], total: 0, missing: [] }
  const categories = [...index.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const byId = new Map(index.components.map((c) => [c.id, c]))
  const rows = categories.flatMap((category) =>
    (selections[category.id] ?? []).map((id) => ({ category, entry: byId.get(id) })),
  )
  const total = rows.reduce((sum, row) => sum + (row.entry?.priceCents ?? 0), 0)
  const missing = categories.filter((c) => c.required && (selections[c.id] ?? []).length === 0)
  return { categories, rows, total, missing }
}

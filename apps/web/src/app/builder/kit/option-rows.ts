import type {
  BuilderIndex,
  ComponentSpecEntry,
  EngineResult,
  Selections,
} from '@buildmyrig/lib'

/**
 * Design kit (entry 50 P2): righe normalizzate per le UI di scelta/swap
 * componenti — ogni design le renderizza come vuole (modal, drawer, lista).
 * Pura: niente fetch, niente store.
 */

export interface OptionRow {
  entry: ComponentSpecEntry
  /** Il componente è tra i picks correnti dello slot. */
  selected: boolean
  /** Perché il componente è escluso dalle regole (null = selezionabile). */
  excludedReason: string | null
  inStock: boolean
  /**
   * Costo/assorbimento che la scelta comporta:
   * - slot single-select: delta vs il primo pick corrente
   *   (candidate − current; senza selezione = il valore del candidato);
   * - slot multi-select: delta additivo (prezzo/tdp del candidato stesso).
   */
  deltaCents: number
  deltaWatts: number
}

const wattsOf = (entry: ComponentSpecEntry | undefined): number =>
  typeof entry?.specs.tdpWatts === 'number' ? entry.specs.tdpWatts : 0

export const buildOptionRows = (
  index: BuilderIndex,
  result: EngineResult,
  categoryId: string,
  selections: Selections,
): OptionRow[] => {
  const category = index.categories.find((c) => c.id === categoryId)
  if (!category) return []

  const excludedBy = new Map<string, string>()
  const categoryEval = result.categories.find((c) => c.categoryId === categoryId)
  for (const e of categoryEval?.excluded ?? []) {
    if (!excludedBy.has(e.componentId)) excludedBy.set(e.componentId, e.message)
  }

  const selectedIds = selections[categoryId] ?? []
  const multi = category.maxSelectable > 1
  const current = multi ? undefined : index.components.find((c) => c.id === selectedIds[0])

  return index.components
    .filter((entry) => entry.categoryId === categoryId)
    .map((entry) => ({
      entry,
      selected: selectedIds.includes(entry.id),
      excludedReason: excludedBy.get(entry.id) ?? null,
      inStock: entry.inStock !== false,
      deltaCents: multi ? entry.priceCents : entry.priceCents - (current?.priceCents ?? 0),
      deltaWatts: multi ? wattsOf(entry) : wattsOf(entry) - wattsOf(current),
    }))
}

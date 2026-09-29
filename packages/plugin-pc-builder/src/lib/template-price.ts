type SlotLike = { component?: unknown } | null | undefined

/** Unique component ids referenced by build-template slots (ids or populated refs). */
export const slotComponentIds = (slots: readonly SlotLike[] | null | undefined): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const slot of slots ?? []) {
    const raw = slot?.component
    if (raw == null) continue
    const id = typeof raw === 'object' && raw !== null && 'id' in raw ? String((raw as { id: unknown }).id) : String(raw)
    if (!seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

export interface PricedComponent {
  id: string | number
  productVariant?: { priceInEUR?: number | null } | null
}

/** Sum of variant prices for the components referenced by the slots. */
export const templateBasePrice = (
  slotIds: readonly string[],
  components: readonly PricedComponent[],
): number => {
  const byId = new Map(components.map((c) => [String(c.id), c]))
  let total = 0
  for (const id of slotIds) {
    const price = byId.get(id)?.productVariant?.priceInEUR
    if (typeof price === 'number') total += price
  }
  return total
}

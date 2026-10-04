import type { BuilderIndex, ComponentSpecEntry, Selections } from './rule-engine'

/**
 * Spec-driven slot caps (entry 50): a selected host component can tighten how
 * many components a slot accepts — e.g. a motherboard's ramSlots caps RAM
 * picks, its m2Slots caps NVMe storage picks. Pure + framework-free so every
 * builder design (and the save endpoint's over-cap warning surface) resolves
 * identical limits. Selections are keyed by category ID; the rules table
 * speaks slugs — resolve slug → category.id via index.categories first.
 */

export interface SlotLimit {
  /** Effective pick cap for the category (never above category.maxSelectable). */
  max: number
  /** Present when a selected host component's spec tightened the cap below
   *  the category policy — designs show this as the "why". */
  cappedBy?: { componentId: string; componentName?: string; field: string }
}

/** Data-driven rule table — a future "case fanSlots caps case-fan" is one entry. */
export const SLOT_LIMIT_RULES = [
  { slotSlug: 'ram', hostSlug: 'motherboard', field: 'ramSlots' },
  { slotSlug: 'storage', hostSlug: 'motherboard', field: 'm2Slots' },
] as const

const mostRestrictiveHost = (
  selections: Selections,
  entryById: Map<string, ComponentSpecEntry>,
  hostCategoryId: string,
  field: string,
): { entry: ComponentSpecEntry; value: number } | null => {
  let best: { entry: ComponentSpecEntry; value: number } | null = null
  for (const id of selections[hostCategoryId] ?? []) {
    const entry = entryById.get(id)
    const value = entry?.specs[field]
    // 0 is a real spec (soldered RAM → no DIMM slots), not "absent" — only
    // non-integer/negative values mean "no data". With multiple host picks
    // the most restrictive one must win, whatever the pick order.
    if (entry && Number.isInteger(value) && (value as number) >= 0) {
      if (!best || (value as number) < best.value) best = { entry, value: value as number }
    }
  }
  return best
}

export const resolveSlotLimits = (index: BuilderIndex, selections: Selections): Record<string, SlotLimit> => {
  const catBySlug = new Map(index.categories.map((c) => [c.slug, c]))
  const entryById = new Map(index.components.map((c) => [c.id, c]))
  const out: Record<string, SlotLimit> = {}
  for (const cat of index.categories) {
    let limit: SlotLimit = { max: cat.maxSelectable }
    const rule = SLOT_LIMIT_RULES.find((r) => r.slotSlug === cat.slug)
    if (rule) {
      const hostCat = catBySlug.get(rule.hostSlug)
      const host = hostCat ? mostRestrictiveHost(selections, entryById, hostCat.id, rule.field) : null
      if (host && host.value < cat.maxSelectable) {
        limit = {
          max: host.value,
          cappedBy: {
            componentId: host.entry.id,
            componentName: host.entry.display?.name,
            field: rule.field,
          },
        }
      }
    }
    out[cat.id] = limit
  }
  return out
}

/**
 * The resolved pick cap for a category — the one expression every design
 * needs (provider.select, slot cards, blueprint, deploy over-cap check).
 * Duplicating `limits[id]?.max ?? maxSelectable ?? 1` at each call site
 * drifted once already (entry-54 review).
 */
export const resolvedMax = (
  limits: Record<string, SlotLimit> | undefined,
  category: { id: string; maxSelectable?: number },
): number => limits?.[category.id]?.max ?? category.maxSelectable ?? 1

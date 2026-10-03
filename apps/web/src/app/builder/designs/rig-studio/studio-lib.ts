import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  Gpu,
  HardDrive,
  MemoryStick,
  Package,
  Wind,
  Zap,
} from 'lucide-react'
import type {
  BuilderIndex,
  ComponentSpecEntry,
  EngineResult,
  Selections,
} from '@buildmyrig/lib'

/**
 * rig-studio helpers (entry 50 P3a): pure, framework-free — no store,
 * no fetch, no useBuilder(). Everything the design derives from
 * categories/entries lives here so it stays unit-testable (studio-lib.test.ts).
 */

export type StudioCategory = BuilderIndex['categories'][number]

/** Design view — 'matrix' is reserved for the P3b round (CompactMatrixView). */
export type StudioView = 'studio' | 'matrix'

// ---------- spec lookup ----------

/** Rule-critical spec first, display-only after — the seed can put the
 *  same field in both pockets, the slotCode stays identical. */
const specOf = (entry: ComponentSpecEntry | undefined, key: string): unknown =>
  entry?.specs[key] ?? entry?.display?.specs?.[key]

const textOf = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const numOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** Numeric spec from specs (rule-critical) or display.specs — null if absent. */
export const numSpecOf = (entry: ComponentSpecEntry | undefined, key: string): number | null =>
  numOf(specOf(entry, key))

/** Spec text from specs or display.specs — null if absent/empty. */
export const textSpecOf = (entry: ComponentSpecEntry | undefined, key: string): string | null =>
  textOf(specOf(entry, key))

// ---------- slotCode ----------

/**
 * The "CAD-style code" of a slot/pick, e.g. `[GPU-01] PCIe 5.0` — plan §6.2.
 * The highlight is the piece of data a builder looks at first on the slot; an
 * unmapped slug (or the missing spec) degrades to the category name, never to
 * an invented value.
 */
export const highlightFor = (
  category: StudioCategory,
  entry: ComponentSpecEntry | undefined,
): string => {
  const fallback = category.name
  switch (category.slug) {
    case 'gpu':
      return textOf(specOf(entry, 'pcieVersion')) ?? fallback
    case 'cpu':
      return textOf(specOf(entry, 'socket')) ?? fallback
    case 'ram': {
      const parts = [
        textOf(specOf(entry, 'ramType')),
        numOf(specOf(entry, 'ramSpeedMhz')) !== null ? `${numOf(specOf(entry, 'ramSpeedMhz'))}MHz` : null,
      ].filter((p): p is string => Boolean(p))
      return parts.length > 0 ? parts.join(' ') : fallback
    }
    case 'storage':
      return textOf(specOf(entry, 'storageInterface')) ?? fallback
    case 'psu': {
      const watts = numOf(specOf(entry, 'psuWatts'))
      return watts !== null ? `${watts}W` : fallback
    }
    case 'cooling': {
      const rad = numOf(specOf(entry, 'radSizeMm'))
      return rad !== null ? `${rad}mm` : fallback
    }
    case 'motherboard':
      return textOf(specOf(entry, 'moboFormFactor')) ?? fallback
    case 'case': {
      const factors = specOf(entry, 'caseSupportedFormFactors')
      return Array.isArray(factors) && factors.length > 0 ? factors.join('/') : fallback
    }
    default:
      return fallback
  }
}

/**
 * `[SLUG-NN] highlight` — slotIndex is 1-based: the second RAM stick is
 * `[RAM-02] …` (multi-slot codes, plan §6.2).
 */
export const slotCode = (
  category: StudioCategory,
  entry: ComponentSpecEntry | undefined,
  slotIndex = 1,
): string => {
  const n = String(Math.max(1, Math.trunc(slotIndex))).padStart(2, '0')
  return `[${category.slug.toUpperCase()}-${n}] ${highlightFor(category, entry)}`
}

// ---------- blueprint zones (plan §6.3) ----------

/**
 * Category slug → SVG blueprint zone. Zones are the IDs of the RigBlueprint
 * shapes (P3b): aio = radiator, mobo = motherboard. Slots without their own
 * zone (os, case-fan, admin custom categories) → undefined:
 * they remain fully usable from bay and matrix (degrade contract §6.3).
 */
export const ZONE_BY_SLUG = {
  gpu: 'gpu',
  cpu: 'cpu',
  cooling: 'aio',
  motherboard: 'mobo',
  ram: 'ram',
  storage: 'storage',
  case: 'case',
  psu: 'psu',
} as const

export type StudioZone = (typeof ZONE_BY_SLUG)[keyof typeof ZONE_BY_SLUG]

/** Human labels for zones — the raw keys ('aio', 'mobo') are SVG-internal. */
export const ZONE_LABEL: Record<StudioZone, string> = {
  case: 'Case',
  mobo: 'Motherboard',
  cpu: 'CPU',
  ram: 'Memory',
  aio: 'Cooling',
  storage: 'Storage',
  gpu: 'GPU',
  psu: 'PSU',
}

export const zoneForCategory = (slug: string): StudioZone | undefined =>
  (ZONE_BY_SLUG as Record<string, StudioZone>)[slug]

// ---------- icons ----------

/** Lucide icon per category slug + fallback (the mockup uses the same idea). */
export const ICON_BY_SLUG: Record<string, LucideIcon> = {
  gpu: Gpu,
  cpu: Cpu,
  cooling: Fan,
  motherboard: CircuitBoard,
  ram: MemoryStick,
  storage: HardDrive,
  case: Box,
  psu: Zap,
  os: AppWindow,
  'case-fan': Wind,
}

export const FALLBACK_ICON: LucideIcon = Package

export const iconForCategory = (slug: string): LucideIcon =>
  ICON_BY_SLUG[slug] ?? FALLBACK_ICON

// ---------- derived values ----------

/** Nominal power draw of a component (specs.tdpWatts) — 0 if absent. */
export const wattsOf = (entry: ComponentSpecEntry | undefined): number =>
  numOf(specOf(entry, 'tdpWatts')) ?? 0

export const priceCentsOf = (entry: ComponentSpecEntry | undefined): number =>
  entry?.priceCents ?? 0

// ---------- P3b: blueprint zones ↔ categories ----------

/**
 * Blueprint zone → builder index category. Inverse of zoneForCategory:
 * if no category maps to the zone (e.g. blueprint with no 'case' slot
 * in the admin index) it returns undefined and the zone stays purely
 * decorative — never clickable, never a crash (degrade contract §6.3).
 */
export const categoryForZone = (
  zone: StudioZone,
  categories: readonly StudioCategory[],
): StudioCategory | undefined => categories.find((c) => zoneForCategory(c.slug) === zone)

/** Entries installed in the category mapped to the zone, in pick order. */
export const picksForZone = (
  zone: StudioZone,
  selections: Selections,
  index: BuilderIndex,
): ComponentSpecEntry[] => {
  const category = categoryForZone(zone, index.categories)
  if (!category) return []
  const byId = new Map(index.components.map((c) => [c.id, c]))
  return (selections[category.id] ?? [])
    .map((id) => byId.get(id))
    .filter((e): e is ComponentSpecEntry => Boolean(e))
}

/** Sum of tdpWatts of the zone's picks (multi-pick included). */
export const zoneWatts = (
  zone: StudioZone,
  selections: Selections,
  index: BuilderIndex,
): number => picksForZone(zone, selections, index).reduce((sum, e) => sum + wattsOf(e), 0)

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))

/**
 * Heatmap weight of a pick (plan §6.1): wattsOf(entry)/maxWatts in 0..1.
 * maxWatts <= 0 or not finite → 0 (never NaN in the markup, never tint on
 * builds without power data).
 */
export const heatmapWeight = (
  entry: ComponentSpecEntry | undefined,
  maxWatts: number,
): number => {
  if (!Number.isFinite(maxWatts) || maxWatts <= 0) return 0
  return clamp01(wattsOf(entry) / maxWatts)
}

// ---------- P3b: PSU + fit metrics ----------

/** Rated wattage of the selected PSU — null if the slot is empty or the spec is absent. */
export const psuRatedWatts = (
  selections: Selections,
  index: BuilderIndex,
): number | null => {
  const picks = picksForZone('psu', selections, index)
  return numSpecOf(picks[0], 'psuWatts')
}

/**
 * PSU margin = selected wattage − engine's recommendedPsuWatts.
 * Positive = headroom, negative = undersized PSU (danger pill).
 * null when there is no PSU selected (or the spec is missing) — components
 * hide the pill/bar in that case, never render "undefined".
 */
export const psuMargin = (
  result: Pick<EngineResult, 'recommendedPsuWatts'>,
  selections: Selections,
  index: BuilderIndex,
): number | null => {
  const rated = psuRatedWatts(selections, index)
  return rated === null ? null : rated - result.recommendedPsuWatts
}

export type GpuFit = 'ok' | 'tight' | 'oversize'

/** Clearance below this threshold (mm) counts as "tight". */
export const GPU_FIT_TIGHT_MM = 10

/**
 * GPU fit vs case: gpuLengthMm against caseGpuMaxLengthMm (plan §6.1).
 * null when either spec is missing — the pill does not render.
 */
export const gpuFit = (
  gpuEntry: ComponentSpecEntry | undefined,
  caseEntry: ComponentSpecEntry | undefined,
): GpuFit | null => {
  const gpu = numSpecOf(gpuEntry, 'gpuLengthMm')
  const max = numSpecOf(caseEntry, 'caseGpuMaxLengthMm')
  if (gpu === null || max === null) return null
  const clearance = max - gpu
  if (clearance < 0) return 'oversize'
  return clearance <= GPU_FIT_TIGHT_MM ? 'tight' : 'ok'
}

/** Picks with display.hasRgb — the "(N linked)" counter of the RGB toolbar. */
export const rgbLinkedCount = (selections: Selections, index: BuilderIndex): number => {
  const byId = new Map(index.components.map((c) => [c.id, c]))
  return Object.values(selections)
    .flat()
    .reduce((count, id) => count + (byId.get(id)?.display?.hasRgb ? 1 : 0), 0)
}

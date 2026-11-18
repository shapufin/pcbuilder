/**
 * Atelier design helpers (entry 131) — pure, framework-free. Presentation
 * vocabulary only: slot numbering/labels, atmosphere + perspective presets,
 * and the power-reserve math. Anything derived from the builder index goes
 * through `kit/part-lib` so both designs share one source of truth.
 */
export type AtelierView = 'studio' | 'blueprint'
export type Atmosphere = 'tungsten' | 'daylight' | 'violet' | 'noir'
export type Perspective = 'iso' | 'internal' | 'airflow'
export type BlueprintLayer = 'composite' | 'pcie' | 'coolant' | 'airflow' | 'clearance'

export const ATMOSPHERES: ReadonlyArray<{ id: Atmosphere; label: string }> = [
  { id: 'tungsten', label: 'Tungsten' },
  { id: 'daylight', label: '6500K Pure' },
  { id: 'violet', label: 'Cyber Violet' },
  { id: 'noir', label: 'Noir' },
]

export const PERSPECTIVES: ReadonlyArray<{ id: Perspective; label: string }> = [
  { id: 'iso', label: 'Front 3/4' },
  { id: 'internal', label: 'Internal Bay' },
  { id: 'airflow', label: 'Airflow' },
]

export const BLUEPRINT_LAYERS: ReadonlyArray<{ id: BlueprintLayer; label: string }> = [
  { id: 'composite', label: 'Composite view' },
  { id: 'pcie', label: 'PCIe 5.0 topology' },
  { id: 'coolant', label: 'Liquid coolant path' },
  { id: 'airflow', label: 'Airflow velocity' },
  { id: 'clearance', label: 'Dynamic clearances' },
]

/** Atelier editorial slot names — the mockup's "01 / Central Processor". */
const SLOT_LABEL: Record<string, string> = {
  cpu: 'Central Processor',
  gpu: 'Graphics Processor',
  cooling: 'Cooling Architecture',
  ram: 'Unified Memory',
  storage: 'Solid State Architecture',
  case: 'Atelier Chassis',
  motherboard: 'Mainboard Topology',
  psu: 'Power Delivery',
  os: 'Operating System',
  'case-fan': 'Case Airflow',
}

export const slotLabel = (slug: string, fallback: string): string => SLOT_LABEL[slug] ?? fallback

/** 1-based, zero-padded — "01" … "10". */
export const slotIndex = (index: number): string =>
  String(Math.max(1, Math.trunc(index))).padStart(2, '0')

/** Atmosphere tint for the stage gradient — theme tokens, never literals. */
export const atmosphereColor = (atmosphere: Atmosphere): string => {
  switch (atmosphere) {
    case 'tungsten':
      return 'var(--color-warning)'
    case 'violet':
      return 'var(--color-accent)'
    case 'noir':
      return 'var(--color-text-muted)'
    case 'daylight':
    default:
      return 'var(--color-primary)'
  }
}

export const atmosphereOpacity = (atmosphere: Atmosphere): number => {
  switch (atmosphere) {
    case 'tungsten':
      return 0.34
    case 'violet':
      return 0.32
    case 'noir':
      return 0.12
    case 'daylight':
    default:
      return 0.3
  }
}

export type PowerReserve = {
  /** Estimated draw vs the chosen PSU. */
  loadPct: number | null
  /** Watts left over the estimated draw (null without a PSU). */
  reserveWatts: number | null
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
}

/**
 * Power reserve math shared by the header chip, the spec-sheet bar and the
 * blueprint card. `rated` is null when no PSU is picked (or the spec is
 * missing) — callers render a hint instead of a bar, never "NaN%".
 */
export const powerReserve = (requiredWatts: number, ratedWatts: number | null): PowerReserve => {
  if (ratedWatts === null || !Number.isFinite(ratedWatts) || ratedWatts <= 0) {
    return { loadPct: null, reserveWatts: null, tone: 'neutral' }
  }
  const loadPct = Math.min(100, Math.round((requiredWatts / ratedWatts) * 100))
  const reserveWatts = ratedWatts - requiredWatts
  const tone = reserveWatts < 0 ? 'danger' : loadPct > 90 ? 'warn' : 'ok'
  return { loadPct, reserveWatts, tone }
}

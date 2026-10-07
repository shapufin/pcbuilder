/**
 * Entry 71 (Nexus) — reads the marketing/spec meta the Nexus surfaces show
 * out of product `specsJson` (the free-form Catalog-tab JSON, NOT the
 * template-gated components.specsJson). Unknown/absent keys just don't
 * render; nothing here is typed rule-critical — builder compatibility keeps
 * using the explicit component fields.
 */

export type NexusSpecMeta = {
  spScore?: number
  goldenBin?: boolean
  delidded?: boolean
  colorHex?: string
  colorName?: string
  formFactor?: string
  acousticFloor?: string
  thermalDelta?: string
  tdpWatts?: number
  features: string[]
}

/** Keys consumed by NexusSpecMeta — excluded from the generic PDP spec table. */
export const NEXUS_META_KEYS = new Set([
  'spScore',
  'goldenBin',
  'delidded',
  'colorHex',
  'colorName',
  'formFactor',
  'acousticFloor',
  'thermalDelta',
  'tdpWatts',
  'features',
])

const asNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

const asStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined

/** Only literal CSS colors may reach style={{background}} — admin JSON is untrusted. */
const asCssColor = (v: unknown): string | undefined => {
  const s = asStr(v)
  if (!s || s.length > 40) return undefined
  return /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z]{3,20})$/.test(s)
    ? s
    : undefined
}

/** Never throws — specsJson is arbitrary admin JSON. */
export function specMeta(specsJson: unknown): NexusSpecMeta {
  const s = (specsJson && typeof specsJson === 'object' ? specsJson : {}) as Record<string, unknown>
  const meta: NexusSpecMeta = { features: [] }
  const spScore = asNum(s.spScore)
  if (spScore !== undefined) meta.spScore = spScore
  if (s.goldenBin === true) meta.goldenBin = true
  if (s.delidded === true) meta.delidded = true
  const colorHex = asCssColor(s.colorHex)
  if (colorHex) meta.colorHex = colorHex
  const colorName = asStr(s.colorName)
  if (colorName) meta.colorName = colorName
  const formFactor = asStr(s.formFactor)
  if (formFactor) meta.formFactor = formFactor
  const acousticFloor = asStr(s.acousticFloor)
  if (acousticFloor) meta.acousticFloor = acousticFloor
  const thermalDelta = asStr(s.thermalDelta)
  if (thermalDelta) meta.thermalDelta = thermalDelta
  const tdpWatts = asNum(s.tdpWatts)
  if (tdpWatts !== undefined) meta.tdpWatts = tdpWatts
  if (Array.isArray(s.features)) {
    meta.features = s.features.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
  }
  return meta
}

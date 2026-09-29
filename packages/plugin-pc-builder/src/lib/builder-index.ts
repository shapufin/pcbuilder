import type { Payload, TypedUser } from 'payload'
import {
  createRuleEngine,
  type BuilderIndex,
  type ComponentDisplay,
  type ComponentSpecEntry,
  type DerivedPowerConfig,
  type RuleDoc,
  type RuleCriticalSpec,
} from '@buildmyrig/lib'

/**
 * Bridges DB rows (compatibility-rules / components / component-categories /
 * derived-power-rules) to the pure rule engine's BuilderIndex shape.
 * Never imports shop code — the variants slug is a soft string reference (A1).
 */

interface RuleRow {
  id: string | number
  enabled?: boolean
  subjectType: 'component' | 'category'
  subjectComponent?: { id: string | number; name?: string } | string | number | null
  subjectCategory?: { id: string | number; name?: string } | string | number | null
  targetType: 'component' | 'category'
  targetComponent?: { id: string | number; name?: string } | string | number | null
  targetCategory?: { id: string | number; name?: string } | string | number | null
  type: RuleDoc['type']
  operator: RuleDoc['operator']
  field: string
  value: string
  severity: RuleDoc['severity']
  bidirectional?: boolean
  message?: string
  updatedAt?: string
}

interface ComponentRow {
  id: string | number
  name: string
  category?: { id: string | number } | string | number | null
  brand?: { id: string | number; name?: string } | string | number | null
  images?: { url?: string | null }[] | null
  description?: string | null
  specsJson?: Record<string, unknown> | null
  productVariant?: {
    id: string | number
    priceInEUR?: number
  } | string | number | null
  socket?: RuleCriticalSpec['socket']
  ramType?: RuleCriticalSpec['ramType']
  ramSpeedMhz?: number
  tdpWatts?: number
  psuWatts?: number
  moboFormFactor?: RuleCriticalSpec['moboFormFactor']
  caseSupportedFormFactors?: RuleCriticalSpec['caseSupportedFormFactors']
  gpuLengthMm?: number
  caseGpuMaxLengthMm?: number
  coolerSocketSupport?: RuleCriticalSpec['coolerSocketSupport']
  storageInterface?: RuleCriticalSpec['storageInterface']
  pcieVersion?: RuleCriticalSpec['pcieVersion']
  updatedAt?: string
}

const idOf = (v: unknown): string => {
  if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id)
  return String(v)
}

const nameOf = (v: unknown): string | undefined => {
  if (v && typeof v === 'object' && 'name' in v) return String((v as { name: unknown }).name)
  return undefined
}

const parseValue = (op: RuleDoc['operator'], raw: string): RuleDoc['value'] => {
  if (op === 'in' || op === 'contains') {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch {
      /* fall through — comma-separated fallback */
    }
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  if (op === 'gte' || op === 'lte') return Number(raw)
  return raw
}

/** Plugin-level fallbacks for the power formula (PcBuilderPluginOptions.powerDefaults). */
let pluginPowerDefaults: { overheadMultiplier?: number; baseWatts?: number } = {}

/** Called once at plugin init (same pattern as registerLineItemType). */
export const setPowerDefaults = (defaults?: { overheadMultiplier?: number; baseWatts?: number }): void => {
  pluginPowerDefaults = defaults ?? {}
}

const MAX_DISPLAY_SPECS = 16

/** Cosmetic specsJson → display chips: primitives + flat primitive arrays only. */
const cosmeticSpecs = (
  raw: Record<string, unknown> | null | undefined,
): ComponentDisplay['specs'] | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const out: NonNullable<ComponentDisplay['specs']> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_DISPLAY_SPECS) break
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value
    } else if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'string' || typeof v === 'number')
    ) {
      out[key] = value as (string | number)[]
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

const displayOf = (c: ComponentRow): ComponentDisplay => {
  const display: ComponentDisplay = { name: c.name }
  const brand = nameOf(c.brand)
  if (brand) display.brand = brand
  const image = c.images?.find((img) => img?.url)?.url
  if (image) display.image = image
  if (c.description) display.description = c.description
  const specs = cosmeticSpecs(c.specsJson)
  if (specs) display.specs = specs
  return display
}

export const buildBuilderIndex = async (payload: Payload): Promise<BuilderIndex> => {
  const [catsRes, compsRes, rulesRes, powerRes] = await Promise.all([
    payload.find({ collection: 'component-categories', limit: 100, sort: 'sortOrder' }),
    payload.find({ collection: 'components', limit: 5000, depth: 1 }),
    payload.find({ collection: 'compatibility-rules', limit: 5000, depth: 1 }),
    payload.find({ collection: 'derived-power-rules', limit: 10, depth: 1 }),
  ])

  const categories = catsRes.docs.map((c) => ({
    id: idOf(c.id),
    slug: c.slug,
    name: c.name,
    required: c.required ?? true,
    maxSelectable: c.maxSelectable ?? 1,
    sortOrder: c.sortOrder ?? 0,
    ...(c.helperText ? { helperText: c.helperText } : {}),
    ...(c.icon ? { icon: c.icon } : {}),
  }))

  const components: ComponentSpecEntry[] = (compsRes.docs as ComponentRow[]).map((c) => {
    const specs: RuleCriticalSpec = {}
    if (c.socket) specs.socket = c.socket
    if (c.ramType) specs.ramType = c.ramType
    if (typeof c.ramSpeedMhz === 'number') specs.ramSpeedMhz = c.ramSpeedMhz
    if (typeof c.tdpWatts === 'number') specs.tdpWatts = c.tdpWatts
    if (typeof c.psuWatts === 'number') specs.psuWatts = c.psuWatts
    if (c.moboFormFactor) specs.moboFormFactor = c.moboFormFactor
    if (c.caseSupportedFormFactors?.length) specs.caseSupportedFormFactors = c.caseSupportedFormFactors
    if (typeof c.gpuLengthMm === 'number') specs.gpuLengthMm = c.gpuLengthMm
    if (typeof c.caseGpuMaxLengthMm === 'number') specs.caseGpuMaxLengthMm = c.caseGpuMaxLengthMm
    if (c.coolerSocketSupport?.length) specs.coolerSocketSupport = c.coolerSocketSupport
    if (c.storageInterface) specs.storageInterface = c.storageInterface
    if (c.pcieVersion) specs.pcieVersion = c.pcieVersion
    const variant = c.productVariant
    const priceCents =
      variant && typeof variant === 'object' && typeof variant.priceInEUR === 'number' ? variant.priceInEUR : 0
    return {
      id: idOf(c.id),
      categoryId: idOf(c.category),
      specs,
      priceCents,
      inStock: true, // per-variant inventory wiring lands with checkout integration
      display: displayOf(c),
    }
  })

  const rules: RuleDoc[] = (rulesRes.docs as RuleRow[])
    .filter((r) => r.enabled !== false)
    .map((r) => ({
      id: idOf(r.id),
      type: r.type,
      operator: r.operator,
      field: r.field,
      value: parseValue(r.operator, r.value),
      severity: r.severity,
      bidirectional: r.bidirectional ?? false,
      message: r.message ?? '',
      subject:
        r.subjectType === 'component'
          ? { kind: 'component', id: idOf(r.subjectComponent), name: nameOf(r.subjectComponent) }
          : { kind: 'category', id: idOf(r.subjectCategory), name: nameOf(r.subjectCategory) },
      target:
        r.targetType === 'component'
          ? { kind: 'component', id: idOf(r.targetComponent), name: nameOf(r.targetComponent) }
          : { kind: 'category', id: idOf(r.targetCategory), name: nameOf(r.targetCategory) },
    }))

  interface PowerRow {
    overheadMultiplier?: number
    baseWatts?: number
    severity?: 'error' | 'warning'
    targetCategory?: { id?: string | number; slug?: string } | string | number | null
  }
  const firstPower = powerRes.docs[0] as PowerRow | undefined
  const tcat = firstPower?.targetCategory
  const targetCategoryId =
    tcat == null ? undefined : typeof tcat === 'object' ? (tcat.id != null ? String(tcat.id) : undefined) : String(tcat)
  const targetCategorySlug = tcat != null && typeof tcat === 'object' ? tcat.slug : undefined
  const power: DerivedPowerConfig = {
    overheadMultiplier: firstPower?.overheadMultiplier ?? pluginPowerDefaults.overheadMultiplier ?? 1.3,
    baseWatts: firstPower?.baseWatts ?? pluginPowerDefaults.baseWatts ?? 100,
    ...(firstPower?.severity === 'error' || firstPower?.severity === 'warning'
      ? { severity: firstPower.severity }
      : {}),
    ...(targetCategoryId ? { targetCategoryId } : {}),
    ...(targetCategorySlug ? { targetCategorySlug } : {}),
  }

  const lastTs = Math.max(
    0,
    ...(rulesRes.docs as RuleRow[]).map((r) => (r.updatedAt ? Date.parse(r.updatedAt) : 0)),
  )
  const rulesVersion = `${rules.length}-${lastTs}`

  return { components, rules, categories, power, rulesVersion }
}

export const getEngine = async (payload: Payload) => createRuleEngine(await buildBuilderIndex(payload))

/** Admin auth helper shared by builder endpoints. */
export const requireStaff = (user: TypedUser | null): boolean =>
  Boolean(
    user &&
      (user as { collection?: string }).collection === 'users' &&
      (user as { roles?: string[] }).roles?.some((r) => ['admin', 'manager'].includes(r)),
  )

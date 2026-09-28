import type { Payload, TypedUser } from 'payload'
import {
  createRuleEngine,
  type BuilderIndex,
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

export const buildBuilderIndex = async (payload: Payload): Promise<BuilderIndex> => {
  const [catsRes, compsRes, rulesRes, powerRes] = await Promise.all([
    payload.find({ collection: 'component-categories', limit: 100, sort: 'sortOrder' }),
    payload.find({ collection: 'components', limit: 5000, depth: 1 }),
    payload.find({ collection: 'compatibility-rules', limit: 5000, depth: 1 }),
    payload.find({ collection: 'derived-power-rules', limit: 10 }),
  ])

  const categories = catsRes.docs.map((c) => ({
    id: idOf(c.id),
    slug: c.slug,
    name: c.name,
    required: c.required ?? true,
    maxSelectable: c.maxSelectable ?? 1,
    sortOrder: c.sortOrder ?? 0,
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

  const firstPower = powerRes.docs[0] as { overheadMultiplier?: number; baseWatts?: number } | undefined
  const power: DerivedPowerConfig = {
    overheadMultiplier: firstPower?.overheadMultiplier ?? 1.3,
    baseWatts: firstPower?.baseWatts ?? 100,
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

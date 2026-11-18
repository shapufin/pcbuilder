/**
 * BuildMyRig rule engine — pure, framework-free, dependency-free.
 * Spec: docs/buildmyrig-plan/06-rule-engine.md
 */

// ---------- Types ----------

export type Socket =
  | 'AM4'
  | 'AM5'
  | 'sTR5'
  | 'sTRX4'
  | 'LGA1200'
  | 'LGA1700'
  | 'LGA1851'
  | 'LGA2066'
  | (string & {})
export type FormFactor = 'ATX' | 'mATX' | 'ITX' | (string & {})

export type RuleCriticalSpec = {
  socket?: Socket
  ramType?: 'DDR4' | 'DDR5'
  ramSpeedMhz?: number
  tdpWatts?: number
  psuWatts?: number
  moboFormFactor?: FormFactor
  caseSupportedFormFactors?: FormFactor[]
  gpuLengthMm?: number
  caseGpuMaxLengthMm?: number
  coolerSocketSupport?: Socket[]
  storageInterface?: 'NVMe' | 'SATA'
  pcieVersion?: '3.0' | '4.0' | '5.0'
  /** Physical DIMM slots on a motherboard — caps RAM picks via resolveSlotLimits. */
  ramSlots?: number
  /** M.2 sockets on a motherboard — caps NVMe storage picks via resolveSlotLimits. */
  m2Slots?: number
  [key: string]: unknown
}

/** Display-only metadata. The engine never inspects it — it exists so the
 *  configurator can render cards (and messages can name parts) from one index. */
export interface ComponentDisplay {
  name: string
  brand?: string
  image?: string | null
  description?: string
  /** Cosmetic (specsJson) key/values for spec chips — never rule-evaluated. */
  specs?: Record<string, string | number | boolean | (string | number)[]>
  /** Display label + unit per cosmetic spec key (from the category's spec template). */
  specLabels?: Record<string, { label: string; unit?: string }>
  /** RGB-capable part — visual designs light its zone under RGB sync. */
  hasRgb?: boolean
}

export interface ComponentSpecEntry {
  id: string
  categoryId: string
  specs: RuleCriticalSpec
  priceCents: number
  inStock?: boolean
  display?: ComponentDisplay
  /** Derived platform memberships ('amd'/'intel'); absent/empty = any path. */
  platforms?: string[]
}

export type RuleType = 'requires' | 'excludes' | 'supports' | 'warns'
export type RuleOperator = 'equals' | 'in' | 'gte' | 'lte' | 'contains'
export type RuleSeverity = 'error' | 'warning' | 'info'

export interface RuleEndpoint {
  kind: 'component' | 'category'
  id: string
  name?: string
}

export interface RuleDoc {
  id: string
  type: RuleType
  operator: RuleOperator
  field: string
  value: string | number | (string | number)[]
  severity: RuleSeverity
  bidirectional: boolean
  message: string
  subject: RuleEndpoint
  target: RuleEndpoint
}

export interface DerivedPowerConfig {
  overheadMultiplier: number
  baseWatts: number
  /** Admin hardening: 'error' blocks saves in validateSelections, 'warning' advises. @default 'warning' */
  severity?: 'error' | 'warning'
  /** Id of the slot the requirement applies to (populated derived-power-rules.targetCategory). */
  targetCategoryId?: string
  /** Slug fallback when only the relationship slug is known. @default 'psu' */
  targetCategorySlug?: string
}

export interface BuilderIndex {
  components: ComponentSpecEntry[]
  rules: RuleDoc[]
  categories: {
    id: string
    slug: string
    name: string
    required: boolean
    maxSelectable: number
    sortOrder: number
    helperText?: string
    icon?: string
  }[]
  power: DerivedPowerConfig
  rulesVersion: string
  /** Usable platform paths (sockets present in data) — builder "build path" UI. */
  platforms?: { id: string; label: string; sockets: string[] }[]
}

export type Selections = Record<string, string[]>

export interface ExcludedComponent {
  componentId: string
  ruleId: string
  severity: 'error'
  message: string
}

export interface Warning {
  componentIdA: string
  componentIdB: string | null
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface CategoryEvaluation {
  categoryId: string
  validComponentIds: string[]
  excluded: ExcludedComponent[]
}

export interface EngineResult {
  categories: CategoryEvaluation[]
  warnings: Warning[]
  recommendedPsuWatts: number
  powerWarnings: Warning[]
}

export interface EvaluationOptions {
  inStockOnly?: boolean
}

export interface SelectionIssue {
  ruleId: string
  severity: 'error' | 'warning'
  message: string
}

export interface SelectionValidation {
  errors: SelectionIssue[]
  warnings: SelectionIssue[]
}

export interface InterpContext {
  componentA?: { id: string; name?: string }
  componentB?: { id: string; name?: string }
  failingSpecValue?: unknown
  [key: string]: unknown
}

// ---------- Operator evaluation ----------

/**
 * Numeric coercion for `gte`/`lte` (entry 131). Version specs are stored as
 * strings ('4.0', '5.0'), and the old number-only guard made every such rule
 * "unsatisfied" — which the `warns` polarity turned into a warning on every
 * candidate (the PCIe rules warned even on an exact match). Numbers stay
 * numbers; numeric strings are parsed; anything else is null (no match).
 */
const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const satisfiesOperator = (
  operator: RuleOperator,
  actual: unknown,
  expected: string | number | (string | number)[],
): boolean => {
  switch (operator) {
    case 'equals':
      return actual === expected
    case 'in':
      return Array.isArray(expected) && expected.includes(actual as never)
    case 'gte': {
      const a = toNumber(actual)
      const e = toNumber(expected)
      return a !== null && e !== null && a >= e
    }
    case 'lte': {
      const a = toNumber(actual)
      const e = toNumber(expected)
      return a !== null && e !== null && a <= e
    }
    case 'contains':
      if (Array.isArray(actual)) {
        if (Array.isArray(expected)) return expected.some((v) => actual.includes(v as never))
        return actual.includes(expected as never)
      }
      return false
    default:
      return false
  }
}

/**
 * Does the candidate VIOLATE the rule?
 * Conservative (A8): missing spec on the candidate never violates.
 * Entry 131: a numeric operator on a non-numeric/blank spec is a data mismatch,
 * not a violation — otherwise every `warns` rule on a text field fires on
 * everything (the PCIe bug).
 */
const violates = (rule: RuleDoc, candidate: ComponentSpecEntry): boolean => {
  const actual = candidate.specs[rule.field]
  if (actual === undefined || actual === null || actual === '') return false
  if ((rule.operator === 'gte' || rule.operator === 'lte') && toNumber(actual) === null) return false
  const ok = satisfiesOperator(rule.operator, actual, rule.value)
  if (rule.type === 'excludes') return ok // excludes: violation when condition IS satisfied
  return !ok // requires / supports / warns: violation when condition NOT satisfied
}

/** Does this rule even apply to the candidate? (component-specific targets only affect that component) */
const appliesTo = (rule: RuleDoc, candidate: ComponentSpecEntry): boolean =>
  rule.target.kind === 'category' || rule.target.id === candidate.id

// ---------- Interpolation ----------

export const interpolate = (message: string, ctx: InterpContext): string => {
  return message.replace(/\{(\w+)\}/g, (match, token: string) => {
    if (token === 'componentA' && ctx.componentA) return ctx.componentA.name ?? ctx.componentA.id
    if (token === 'componentB' && ctx.componentB) return ctx.componentB.name ?? ctx.componentB.id
    if (token in ctx && token !== 'componentA' && token !== 'componentB') {
      const v = (ctx as Record<string, unknown>)[token]
      if (v !== undefined) return String(v)
    }
    return match // unknown token passes through unchanged (never throws)
  })
}

const buildInterp = (
  rule: RuleDoc,
  subjectEntry: ComponentSpecEntry | undefined,
  candidate: ComponentSpecEntry,
): InterpContext => {
  const subjectSpec = subjectEntry?.specs?.[rule.field]
  const failingSpecValue = candidate.specs[rule.field]
  const ctx: InterpContext = {
    componentA: subjectEntry
      ? { id: subjectEntry.id, name: subjectEntry.display?.name ?? subjectEntry.id }
      : undefined,
    componentB: { id: candidate.id, name: candidate.display?.name ?? candidate.id },
    failingSpecValue,
  }
  if (failingSpecValue !== undefined) ctx[rule.field] = String(failingSpecValue)
  // 04-compatibility.md tokens: {socketA}/{socketB} = each side's value of the
  // rule's field (generic: {<field>A} / {<field>B}).
  if (subjectSpec !== undefined && subjectSpec !== null) ctx[`${rule.field}A`] = String(subjectSpec)
  if (failingSpecValue !== undefined && failingSpecValue !== null) ctx[`${rule.field}B`] = String(failingSpecValue)
  return ctx
}

// ---------- Engine ----------

export interface RuleEngine {
  evaluate(selections: Selections, options?: EvaluationOptions): EngineResult
  validateSelections(selections: Selections): SelectionValidation
  explainIncompatibility(componentId: string, selections: Selections): ExcludedComponent[]
  interpolate(message: string, ctx: InterpContext): string
  recommendedPsuWatts(selections: Selections): number
  conflictsFor(componentId: string): { rule: RuleDoc; other: ComponentSpecEntry }[]
}

interface CompiledRule {
  rule: RuleDoc
  /** candidate ids this rule blocks (error severity, non-warns) — precomputed at load */
  blocked: Set<string> | null
  /** candidate ids this rule flags as warnings on selected combos */
  warns: Set<string> | null
}

export const createRuleEngine = (index: BuilderIndex): RuleEngine => {
  const specMap = new Map<string, ComponentSpecEntry>(index.components.map((c) => [c.id, c]))
  const powerSeverity: 'error' | 'warning' = index.power.severity === 'error' ? 'error' : 'warning'
  // Resolve the slot the power requirement targets (production ids are numeric,
  // so a slug-only match never fires). Try each candidate as id, then as slug —
  // a stale configured id (deleted category) must not silently kill the warning.
  const powerTargetCandidates = [
    index.power.targetCategoryId,
    index.power.targetCategorySlug,
    'psu',
  ].filter((v): v is string => Boolean(v))
  let powerTargetId = powerTargetCandidates[0] ?? 'psu'
  for (const key of powerTargetCandidates) {
    if (index.categories.some((c) => c.id === key)) {
      powerTargetId = key
      break
    }
    const bySlug = index.categories.find((c) => c.slug === key)
    if (bySlug) {
      powerTargetId = bySlug.id
      break
    }
  }
  const byCategory = new Map<string, ComponentSpecEntry[]>()
  for (const c of index.components) {
    const list = byCategory.get(c.categoryId) ?? []
    list.push(c)
    byCategory.set(c.categoryId, list)
  }

  // Mirror bidirectional rules in-memory (A2): subject↔target swapped;
  // mirror target normalized to the original subject's category.
  const allRules: RuleDoc[] = [...index.rules]
  for (const rule of index.rules) {
    if (!rule.bidirectional) continue
    const mirrorTargetCategory =
      rule.subject.kind === 'component' ? specMap.get(rule.subject.id)?.categoryId : rule.subject.id
    if (!mirrorTargetCategory) continue
    allRules.push({
      ...rule,
      id: `${rule.id}:mirror`,
      subject: rule.target,
      target: { kind: 'category', id: mirrorTargetCategory },
    })
  }

  // Precompute per-rule verdicts (violates() depends only on rule + candidate).
  // Mirrors with a CATEGORY subject get null static sets: their reverse check is
  // dynamic — the selected component's actual spec value drives it (a static
  // value would fire for every selection in the category, not just matching ones).
  const isDynamicMirror = (rule: RuleDoc): boolean =>
    rule.id.endsWith(':mirror') && rule.subject.kind === 'category'

  const compile = (rule: RuleDoc): CompiledRule => {
    if (isDynamicMirror(rule)) return { rule, blocked: null, warns: null }
    const blocking = rule.type !== 'warns' && rule.severity === 'error'
    const targetCategory =
      rule.target.kind === 'component' ? specMap.get(rule.target.id)?.categoryId : rule.target.id
    const candidates = targetCategory ? byCategory.get(targetCategory) ?? [] : []
    let blocked: Set<string> | null = null
    let warns: Set<string> | null = null
    for (const candidate of candidates) {
      if (!appliesTo(rule, candidate)) continue
      if (violates(rule, candidate)) {
        if (blocking) {
          blocked ??= new Set()
          blocked.add(candidate.id)
        } else {
          warns ??= new Set()
          warns.add(candidate.id)
        }
      }
    }
    return { rule, blocked, warns }
  }

  const compiled: CompiledRule[] = allRules.map(compile)

  // Group by "subjectKey|targetCategoryId" for O(1) lookup
  const grouped = new Map<string, CompiledRule[]>()
  for (const cr of compiled) {
    const rule = cr.rule
    const subjectKey = rule.subject.kind === 'component' ? rule.subject.id : `cat:${rule.subject.id}`
    const targetCategoryId =
      rule.target.kind === 'component' ? specMap.get(rule.target.id)?.categoryId ?? '' : rule.target.id
    const key = `${subjectKey}|${targetCategoryId}`
    const list = grouped.get(key) ?? []
    list.push(cr)
    grouped.set(key, list)
  }

  const activeSubjects = (selections: Selections): { keys: Set<string>; selectedIds: string[] } => {
    const keys = new Set<string>()
    const selectedIds: string[] = []
    for (const ids of Object.values(selections)) {
      for (const id of ids) {
        const entry = specMap.get(id)
        if (!entry) continue // stale selection — ignored, no throw
        selectedIds.push(id)
        keys.add(id)
        keys.add(`cat:${entry.categoryId}`)
      }
    }
    return { keys, selectedIds }
  }

  const rulesFor = (subjectKeys: Set<string>, targetCategoryId: string): CompiledRule[] => {
    const result: CompiledRule[] = []
    for (const key of subjectKeys) {
      const list = grouped.get(`${key}|${targetCategoryId}`)
      if (list) result.push(...list)
    }
    return result
  }

  /**
   * Dynamic mirror verdicts — bidirectional rules whose reverse check depends on
   * the selected component's actual spec, not the static rule value:
   * - requires/supports/warns: "S requires T.F = S.F" → a selected t blocks
   *   candidates whose F does not match t.F (the selected board's socket drives
   *   the CPU filter, whichever socket the board has).
   * - excludes: "S excludes T.F = V" → a selected t matching V blocks the S side
   *   (the specific component, or its whole category).
   */
  const dynamicMirrorSets = (
    cr: CompiledRule,
    candidates: ComponentSpecEntry[],
    selections: Selections,
  ): { blocked: Set<string> | null; warns: Set<string> | null } => {
    const rule = cr.rule
    const subjectIds = selections[rule.subject.id] ?? []
    const subjectEntry = subjectIds
      .map((id) => specMap.get(id))
      .find((e): e is ComponentSpecEntry => Boolean(e))
    if (!subjectEntry) return { blocked: null, warns: null }

    if (rule.type === 'excludes') {
      const cond = satisfiesOperator(rule.operator, subjectEntry.specs[rule.field], rule.value)
      if (!cond) return { blocked: null, warns: null }
      const blockSingle = rule.target.kind === 'component'
      const blocked = new Set<string>()
      for (const candidate of candidates) {
        if (blockSingle && candidate.id !== rule.target.id) continue
        blocked.add(candidate.id)
      }
      return { blocked, warns: null }
    }

    const blocking = rule.type !== 'warns' && rule.severity === 'error'
    let blocked: Set<string> | null = null
    let warns: Set<string> | null = null
    for (const candidate of candidates) {
      if (!appliesTo(rule, candidate)) continue
      // A8 — missing spec never violates: `coolerSocketSupport` exists only on
      // the cooler, so the mirror must not compare the candidate's spec against
      // the other side's undefined (asymmetric fields are checked by the
      // forward rule instead).
      const candidateSpec = candidate.specs[rule.field]
      const subjectSpec = subjectEntry.specs[rule.field]
      if (candidateSpec == null || subjectSpec == null) continue
      const cond = satisfiesOperator(rule.operator, candidateSpec, subjectSpec as string | number | (string | number)[])
      if (cond) continue
      if (blocking) {
        blocked ??= new Set()
        blocked.add(candidate.id)
      } else {
        warns ??= new Set()
        warns.add(candidate.id)
      }
    }
    return { blocked, warns }
  }

  const computePower = (selections: Selections): { required: number; psuEntry?: ComponentSpecEntry } => {
    let tdpSum = 0
    let psuEntry: ComponentSpecEntry | undefined
    for (const ids of Object.values(selections)) {
      for (const id of ids) {
        const entry = specMap.get(id)
        if (!entry) continue
        tdpSum += typeof entry.specs.tdpWatts === 'number' ? entry.specs.tdpWatts : 0
        if (entry.categoryId === powerTargetId) psuEntry = entry
      }
    }
    return {
      required: Math.round(tdpSum * index.power.overheadMultiplier + index.power.baseWatts),
      psuEntry,
    }
  }

  // ---- validateSelections / evaluate helpers (audit 2026-11-18 R4: the two
  // entry points were single 60–110-cognitive-complexity functions; each
  // decision now has a name). Behaviour is unchanged — rule-engine tests pin it.

  /** Does rule `cr` fire from selected entry `a`? Dynamic mirrors fire from their subject category. */
  const firesFrom = (cr: CompiledRule, a: ComponentSpecEntry): boolean => {
    const rule = cr.rule
    if (isDynamicMirror(rule)) return a.categoryId === rule.subject.id
    const subjectKey = rule.subject.kind === 'component' ? rule.subject.id : `cat:${rule.subject.id}`
    return (subjectKey === a.id || subjectKey === `cat:${a.categoryId}`) && Boolean(cr.blocked ?? cr.warns)
  }

  /** Dynamic-mirror pair check: null = no issue, true = blocking, false = warning. */
  const dynamicPairVerdict = (rule: RuleDoc, a: ComponentSpecEntry, b: ComponentSpecEntry): boolean | null => {
    const bOnTargetSide = rule.target.kind === 'category' ? b.categoryId === rule.target.id : b.id === rule.target.id
    if (!bOnTargetSide) return null
    if (rule.type === 'excludes') {
      // reverse of "S excludes T.F=V": selected t matching V blocks the S side
      if (!satisfiesOperator(rule.operator, a.specs[rule.field], rule.value)) return null
      return rule.severity === 'error'
    }
    // A8 — missing spec never violates (mirrors the evaluate-path skip in
    // dynamicMirrorSets: asymmetric fields like coolerSocketSupport must not
    // be compared against the other side's undefined spec).
    const aSpec = a.specs[rule.field]
    const bSpec = b.specs[rule.field]
    if (aSpec == null || bSpec == null) return null
    if (satisfiesOperator(rule.operator, bSpec, aSpec as string | number | (string | number)[])) return null
    return rule.type !== 'warns' && rule.severity === 'error'
  }

  /** Pair verdict for any compiled rule: null = no issue, true = blocking, false = warning. */
  const pairVerdict = (cr: CompiledRule, a: ComponentSpecEntry, b: ComponentSpecEntry): boolean | null => {
    if (isDynamicMirror(cr.rule)) return dynamicPairVerdict(cr.rule, a, b)
    const set = cr.blocked ?? cr.warns
    if (!set || !set.has(b.id)) return null
    return cr.blocked?.has(b.id) ?? false
  }

  const subjectEntryFor = (rule: RuleDoc, a: ComponentSpecEntry): ComponentSpecEntry | undefined => {
    if (isDynamicMirror(rule)) return a
    return rule.subject.kind === 'component'
      ? specMap.get(rule.subject.id)
      : ({ id: rule.subject.id, display: { name: rule.subject.name } } as ComponentSpecEntry)
  }

  /** PSU shortfall for the current selection, or null when the PSU covers the draw. */
  const powerShortfall = (selections: Selections) => {
    const { required, psuEntry } = computePower(selections)
    const watts = psuEntry?.specs.psuWatts
    if (!psuEntry || typeof watts !== 'number' || watts >= required) return { required, shortfall: null }
    return { required, shortfall: { psuEntry, watts } }
  }

  /**
   * Validates a FIXED selection set (a saved build): every selected pair is
   * checked against blocking rules — unlike evaluate(), which only filters
   * unselected candidates. Used server-side at build save and checkout.
   */
  const validateSelections = (selections: Selections): SelectionValidation => {
    const { selectedIds } = activeSubjects(selections)
    const errors: SelectionIssue[] = []
    const warnings: SelectionIssue[] = []
    const seen = new Set<string>()
    const entries = selectedIds.map((id) => specMap.get(id)).filter((e): e is ComponentSpecEntry => Boolean(e))

    for (const a of entries) {
      for (const cr of compiled) {
        if (!firesFrom(cr, a)) continue
        for (const b of entries) {
          if (b.id === a.id) continue
          const blocking = pairVerdict(cr, a, b)
          if (blocking === null) continue
          const ruleId = cr.rule.id.replace(/:mirror$/, '')
          const dedupKey = `${ruleId}|${[a.id, b.id].sort().join('|')}`
          if (seen.has(dedupKey)) continue
          seen.add(dedupKey)
          const issue: SelectionIssue = {
            ruleId,
            severity: blocking ? 'error' : 'warning',
            message: interpolate(cr.rule.message, buildInterp(cr.rule, subjectEntryFor(cr.rule, a), b)),
          }
          if (blocking) errors.push(issue)
          else warnings.push(issue)
        }
      }
    }

    const { required, shortfall } = powerShortfall(selections)
    if (shortfall) {
      const powerIssue: SelectionIssue = {
        ruleId: 'derived-power',
        severity: powerSeverity,
        message: `PSU insufficient: system draw ~${required} W, PSU rated ${shortfall.watts} W — pick >= ${required} W`,
      }
      if (powerSeverity === 'error') errors.push(powerIssue)
      else warnings.push(powerIssue)
    }

    return { errors, warnings }
  }

  /** evaluate(): candidates hidden by an active blocking rule (first rule wins). */
  const categoryExclusions = (
    relevant: CompiledRule[],
    candidates: ComponentSpecEntry[],
    selections: Selections,
  ): Map<string, CompiledRule> => {
    const excludedBy = new Map<string, CompiledRule>()
    for (const cr of relevant) {
      const blocked = isDynamicMirror(cr.rule) ? dynamicMirrorSets(cr, candidates, selections).blocked : cr.blocked
      if (!blocked) continue
      for (const id of blocked) if (!excludedBy.has(id)) excludedBy.set(id, cr)
    }
    return excludedBy
  }

  /**
   * evaluate(): warns-type rules surface on ALL candidates (card badges);
   * warning/info-severity blocking rules surface only on live selected combos.
   */
  const categoryWarnings = (
    relevant: CompiledRule[],
    candidates: ComponentSpecEntry[],
    selections: Selections,
    selectedInCategory: string[],
    selectedIds: string[],
  ): Warning[] => {
    const out: Warning[] = []
    for (const cr of relevant) {
      const dyn = isDynamicMirror(cr.rule) ? dynamicMirrorSets(cr, candidates, selections) : null
      const warns = dyn ? dyn.warns : cr.warns
      if (!warns) continue
      const severity: 'warning' | 'info' =
        cr.rule.type === 'warns' ? 'warning' : cr.rule.severity === 'error' ? 'warning' : cr.rule.severity
      const flaggedIds = cr.rule.type === 'warns' ? Array.from(warns) : selectedInCategory.filter((id) => warns.has(id))
      for (const candidateId of flaggedIds) {
        const candidate = specMap.get(candidateId)
        if (!candidate) continue
        const subjectEntry = selectedIds
          .map((id) => specMap.get(id))
          .find((e): e is ComponentSpecEntry => Boolean(e) && e!.id !== candidateId)
        out.push({
          componentIdA: subjectEntry?.id ?? cr.rule.subject.id,
          componentIdB: candidateId,
          ruleId: cr.rule.id,
          severity,
          message: interpolate(cr.rule.message, buildInterp(cr.rule, subjectEntry, candidate)),
        })
      }
    }
    return out
  }

  const evaluate = (selections: Selections, options: EvaluationOptions = {}): EngineResult => {
    const inStockOnly = options.inStockOnly ?? true
    const { keys: subjectKeys, selectedIds } = activeSubjects(selections)
    const categories: CategoryEvaluation[] = []
    const warnings: Warning[] = []

    for (const category of index.categories) {
      const selectedInCategory = selections[category.id] ?? []
      const candidates = byCategory.get(category.id) ?? []
      const relevant = rulesFor(subjectKeys, category.id)
      const excludedBy = categoryExclusions(relevant, candidates, selections)

      const excluded: ExcludedComponent[] = []
      const validComponentIds: string[] = []
      for (const candidate of candidates) {
        if (inStockOnly && candidate.inStock === false) continue
        const cr = excludedBy.get(candidate.id)
        if (cr && !selectedInCategory.includes(candidate.id)) {
          excluded.push({
            componentId: candidate.id,
            ruleId: cr.rule.id,
            severity: 'error',
            message: interpolate(cr.rule.message, buildInterp(cr.rule, specMap.get(selectedIds[0]), candidate)),
          })
        } else {
          validComponentIds.push(candidate.id)
        }
      }

      warnings.push(...categoryWarnings(relevant, candidates, selections, selectedInCategory, selectedIds))
      categories.push({ categoryId: category.id, validComponentIds, excluded })
    }

    const { required, shortfall } = powerShortfall(selections)
    const powerWarnings: Warning[] = shortfall
      ? [
          {
            componentIdA: shortfall.psuEntry.id,
            componentIdB: null,
            ruleId: 'derived-power',
            severity: powerSeverity,
            message: `PSU insufficient: system draw ~${required} W, PSU rated ${shortfall.watts} W - pick >= ${required} W`,
          },
        ]
      : []

    return { categories, warnings, recommendedPsuWatts: required, powerWarnings }
  }

  const explainIncompatibility = (componentId: string, selections: Selections): ExcludedComponent[] => {
    const { keys: subjectKeys } = activeSubjects(selections)
    const candidate = specMap.get(componentId)
    if (!candidate) return []
    const out: ExcludedComponent[] = []
    for (const cr of rulesFor(subjectKeys, candidate.categoryId)) {
      if (!cr.blocked || !cr.blocked.has(candidate.id)) continue
      out.push({
        componentId,
        ruleId: cr.rule.id,
        severity: 'error',
        message: interpolate(cr.rule.message, buildInterp(cr.rule, undefined, candidate)),
      })
    }
    return out
  }

  const conflictsFor = (componentId: string): { rule: RuleDoc; other: ComponentSpecEntry }[] => {
    const out: { rule: RuleDoc; other: ComponentSpecEntry }[] = []
    for (const cr of compiled) {
      const rule = cr.rule
      if (rule.subject.kind === 'component' && rule.subject.id === componentId && cr.blocked) {
        for (const id of cr.blocked) {
          const other = specMap.get(id)
          if (other) out.push({ rule, other })
        }
      }
      if (rule.target.kind === 'component' && rule.target.id === componentId) {
        const subjectCatId =
          rule.subject.kind === 'component' ? specMap.get(rule.subject.id)?.categoryId : rule.subject.id
        if (!subjectCatId) continue
        for (const other of byCategory.get(subjectCatId) ?? []) {
          if (violates(rule, other)) out.push({ rule, other })
        }
      }
    }
    return out
  }

  return {
    evaluate,
    validateSelections,
    explainIncompatibility,
    interpolate,
    recommendedPsuWatts: (selections) => computePower(selections).required,
    conflictsFor,
  }
}

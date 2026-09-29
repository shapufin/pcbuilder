# 06 · Rule Engine Spec

Lives in `packages/lib`. Framework-free, zero runtime deps, 100% unit-tested (Vitest), used identically client-side (filtering + UI) and server-side (checkout validation). The engine never touches Payload — it receives plain JSON shapes.

## Data shapes (TypeScript)

```typescript
// ---- Index input (built once per load from DB docs) ----
export type RuleCriticalSpec = {
  socket?: 'AM5' | 'LGA1700' | 'LGA1851'
  ramType?: 'DDR4' | 'DDR5'
  ramSpeedMhz?: number
  tdpWatts?: number
  psuWatts?: number
  moboFormFactor?: 'ATX' | 'mATX' | 'ITX'
  caseSupportedFormFactors?: ('ATX' | 'mATX' | 'ITX')[]
  gpuLengthMm?: number
  caseGpuMaxLengthMm?: number
  coolerSocketSupport?: ('AM5' | 'LGA1700' | 'LGA1851')[]
  storageInterface?: 'NVMe' | 'SATA'
  pcieVersion?: '3.0' | '4.0' | '5.0'
}

export interface ComponentSpecEntry {
  id: string
  categoryId: string           // componentCategories.slug
  specs: RuleCriticalSpec      // typed specs ONLY; specsJson never enters the engine
  priceCents: number           // display; server re-resolves at checkout
}

export type RuleType = 'requires' | 'excludes' | 'supports' | 'warns'
export type RuleOperator = 'equals' | 'in' | 'gte' | 'lte' | 'contains'
export type RuleSeverity = 'error' | 'warning' | 'info'

export interface RuleDoc {
  id: string
  type: RuleType
  operator: RuleOperator
  field: keyof RuleCriticalSpec | string       // engine inspects only typed spec keys
  value: string | number | (string | number)[]
  severity: RuleSeverity
  bidirectional: boolean
  message: string                              // tokens: {componentA} {componentB} {<specKey>}
  subject: { kind: 'component' | 'category'; id: string }
  target: { kind: 'component' | 'category'; id: string }
}

export interface DerivedPowerConfig {
  overheadMultiplier: number    // default 1.3 (assumption A7)
  baseWatts: number             // default 100
}

export interface BuilderIndex {
  components: ComponentSpecEntry[]
  rules: RuleDoc[]
  categories: { id: string; slug: string; name: string; required: boolean; maxSelectable: number; sortOrder: number }[]
  power: DerivedPowerConfig
  rulesVersion: string          // cache tag; stale ConfiguredBuild snapshots re-validate
}

// ---- Evaluation ----
export type Selections = Record<string, string[]>   // { [categoryId]: componentIds[] }

export interface ExcludedComponent {
  componentId: string
  ruleId: string
  severity: 'error'
  message: string              // interpolated
}
export interface Warning {
  componentIdA: string
  componentIdB: string | null   // null for power warnings
  ruleId: string
  severity: 'warning' | 'info'
  message: string
}

export interface CategoryEvaluation {
  categoryId: string
  validComponentIds: string[]          // in-stock + compatible
  excluded: ExcludedComponent[]        // blocked with the rule + message that excluded it
}
export interface EngineResult {
  categories: CategoryEvaluation[]
  warnings: Warning[]                  // for currently selected combos
  recommendedPsuWatts: number          // requiredWatts from DerivedPowerRule
  powerWarnings: Warning[]
}

export interface EvaluationOptions {
  inStockOnly?: boolean                // default true client-side, false for stock-recheck server-side
}
```

## Algorithm pseudocode

```
load(index): RuleEngine
  rules' = for each rule: rule; if rule.bidirectional: + mirror(rule)   // mirrored in-memory, A2
  groupedByPair = Map< "subjCat|targetCat", RuleDoc[] >                 // one lookup per candidate pair
  specMap = Map< componentId, ComponentSpecEntry >

evaluate(selections, options): EngineResult
  selected = flatten(selections)                                        // currently chosen ids
  selectedEntries = selected → specMap

  // Pass 1 — required power
  tdpSum = sum(selectedEntries.tdpWatts || 0)
  recommendedPsuWatts = tdpSum * power.overheadMultiplier + power.baseWatts

  // Pass 2 — per category, per candidate
  for each category c:
    candidates = index.components where categoryId == c (in-stock if options.inStockOnly)
    pairRules = rules' where subject ∈ selected ∪ {categories of selected} and target.category == c
    for each candidate comp:
      violations = pairRules where condition(candidate = comp, subject = selected) fails
      if any violation has type ∈ {requires, excludes, supports} → excluded.push({comp, rule, message})
  valid = candidates − excluded

  // Pass 3 — warnings on selected combos
  for each pair (a, b) of selectedEntries where pairRules exist:
    if fails → warnings.push(interpolated message)
  powerWarnings = if psu selected and psuWatts < recommendedPsuWatts → warning

condition(candidate, subject, rule):
  v = candidate.specs[rule.field]
  equals: v == rule.value        in: rule.value.includes(v)     gte: v >= rule.value
  lte: v <= rule.value           contains: v ∈ rule.value (array spec)
  missing v → rule fails only for `excludes` (conservative: never blocks on missing data, A8)
  A8 also applies to dynamic bidirectional mirroring: when either side lacks the
  mirrored field, the pair is skipped (entry 15 — `coolerSocketSupport` exists only
  on coolers, so comparing it against a CPU's missing spec blocked every CPU+cooler save)
```

**Message interpolation** (pure fn, testable): replace `{componentA}`/`{componentB}` with names; `{socket}`/`{key}` with the violating component's failing spec value; unknown token → left as-is (never throws).

## Complexity

- Load: O(R) rules + mirror pass O(bidirectional rules).
- Evaluate: for each category O(C_c candidates) with O(1) rule lookup via `groupedByPair` + subject-set membership hash → **O(components), not O(components × rules)**. Warnings pass is O(S²) on selected (S ≤ ~12, trivial).
- Expected scale: ≤ 5,000 components, ≤ 2,000 rules. Client index JSON ≈ 5,000 × ~120B specs + 2,000 × ~200B rules ≈ 1MB raw, ~250KB gzipped — under the 300KB budget (assumption A9 holds; if rules grow 10×, page splits the index by category pair on demand).
- Server-side evaluation happens at build save and checkout on a cached in-memory index — O(components) per call, no DB reads during evaluation.

## Public API (`packages/lib/src/rule-engine`)

```typescript
export function createRuleEngine(index: BuilderIndex): RuleEngine
interface RuleEngine {
  evaluate(selections: Selections, options?: EvaluationOptions): EngineResult
  explainIncompatibility(componentId: string, selections: Selections): ExcludedComponent[]  // "why is this incompatible?"
  interpolate(message: string, ctx: InterpContext): string
  recommendedPsuWatts(selections: Selections): number
  conflictsFor(componentId: string): { rule: RuleDoc; other: ComponentSpecEntry }[]   // admin conflict field
}
```

## Server-side price & validation flow at checkout

1. Client sends `configuredBuildId` (never a price).
2. Server loads build's current slots, runs `createRuleEngine(cachedServerIndex).evaluate(slots, { inStockOnly: false })` — errors abort checkout with per-slot reasons.
3. Price = Σ current DB variant prices × quantity + tax; `priceSnapshot` recomputed and stored; discount validated server-side. Client `priceSnapshot` is display-only and stale-snapshot is overwritten.

## Named test cases (Vitest, ≥20)

| # | Test case |
| --- | --- |
| 1 | `requires` rule blocks target when condition fails (CPU socket AM5 requires motherboard socket AM5) |
| 2 | `requires` rule passes target when condition satisfied |
| 3 | `excludes` blocks exact incompatible target (DDR4 RAM excluded when DDR5 board selected) |
| 4 | `supports` whitelist allows only listed targets |
| 5 | `warns` type never excludes — appears only in warnings |
| 6 | `bidirectional: true` mirrored rule catches reverse selection (motherboard selected first, CPU later) |
| 7 | Bidirectional `false` does NOT mirror |
| 8 | **Circular rules** (A requires B, B requires A) — both selections satisfy; empty selection doesn't loop |
| 9 | **Circular exclusion** (A excludes B, B excludes A) — first pick wins, second is excluded deterministically |
| 10 | **Rule on missing spec** — candidate lacks the inspected field: `excludes` conservative non-block, `requires` non-block (A8), no throw |
| 11 | **Empty category** — no components in category → validComponentIds = [], no excluded, no crash |
| 12 | **Mutually exclusive pair** (ITX case excludes ATX board + ATX board excludes ITX case) — each pick excludes the other |
| 13 | Operator `in` with array value |
| 14 | Operator `gte` (PSU wattage) boundary equality passes |
| 15 | Operator `lte` (GPU length vs case max) boundary passes |
| 16 | Operator `contains` on array spec (case form factors) |
| 17 | Category-subject rules apply to ALL candidates of that category, not one component |
| 18 | Component-subject rule fires only when that exact component is selected |
| 19 | maxSelectable > 1 (storage ×2) — both selections evaluated as subjects |
| 20 | Message interpolation with all tokens + unknown token passthrough |
| 21 | Interpolation never throws on missing spec in message context |
| 22 | Power rule: recommendedPsuWatts = Σtdp × 1.3 + 100 exact math |
| 23 | Power warning when psuWatts < requiredWatts; equality no warning |
| 24 | No PSU selected → recommendedPsuWatts exposed, no warning |
| 25 | `inStockOnly` filters out-of-stock from valid but keeps them for `explainIncompatibility` |
| 26 | Stale index — unknown componentId in selections ignored (no throw) |
| 27 | Empty selections → all categories fully valid, zero warnings |
| 28 | 5,000 components / 2,000 rules scale benchmark evaluates < 20ms (performance regression test) |
| 89 | Asymmetric-field mirror: dynamic mirror skips when either side lacks the mirrored field — matching CPU+cooler pair saves; wrong cooler still blocked by its forward rule (entry 15, A8 clarification) |
| 90 | Evaluate with a pre-selected cooler excludes no CPU (same A8 skip; entry-15 live bug fix) |

(Rows beyond 28 are later-entry regression tests numbered in the cross-entry sequence; see [18-progress-log.md](18-progress-log.md).)

## Admin editing UX (see also 04/compatibility.md)

- Custom admin view "Compatibility Rules": grid + CSV import/export — planned in [04-collections/compatibility.md](04-collections/compatibility.md).
- Per-component live conflict field planned there too; both consume `conflictsFor()` — the same engine the storefront uses, guaranteeing admin and customer see identical rule outcomes.

# 20 — Spec templates + auto-derived compatibility + platform path — design

Status: **approved (design)** — brainstormed 2026-10-19, awaiting implementation plan.
Source: user request — "spec per category … we always know them"; "the conditional
a bit automatic, I don't have to write rules all the time"; "if I select AMD build it
will first use all AMD categories … changing it later cleans the mobo/cpu/ram fields".

Three changes, one spec:

- **A. Per-category spec templates** — `specsJson` stays storage; a code registry
  gives each category a known spec vocabulary rendered as a real admin form.
- **B. Auto-derived compatibility** — standard relations are synthesized from typed
  spec fields at `buildBuilderIndex` time; hand-written `compatibility-rules` remain
  only for genuine specials.
- **C. Platform path** — an AMD/Intel/"No preference" selector on `/builder` + a
  persistent in-builder chip; hard-filters socket-bound categories; switching
  clears dependent picks.

## A. Spec template registry

New module `packages/plugin-pc-builder/src/lib/spec-templates.ts`:

```ts
export type SpecFieldDef = {
  key: string                                  // 'efficiency'
  label: string                                // 'Efficiency rating'
  type: 'number' | 'text' | 'select' | 'multiselect' | 'boolean'
  unit?: string                                // 'GB', 'mm', 'MHz'
  options?: string[]                           // select/multiselect only
}
export const SPEC_TEMPLATES: Record<string, SpecFieldDef[]>  // category slug → defs
export function specTemplateFor(categorySlug: string): SpecFieldDef[]
export function specLabel(categorySlug: string, key: string): { label: string; unit?: string }
```

Registry keys per category (mirrors today's seed vocab):

| Category | Keys |
|---|---|
| cpu | cores, threads, clockBoostGhz, cacheL3Mb |
| ram | kitGb, casLatency |
| gpu | vram, boostMhz, peakDrawW |
| storage | capacityTb, readMbps |
| motherboard | chipset, wifi(text — seed uses 'WiFi 6E') |
| case | frontFanMounts |
| cooling | radSizeMm, fanCount, noiseDbA |
| case-fan | fanSizeMm, noiseDbA |
| os | — (no template) |

Admin UX (custom `ui` field `SpecFieldsField` in
`packages/plugin-pc-builder/src/admin/`, same import pattern as `ConflictsField`):

- Reads sibling `category` via `useFormFields`/`useWatchForm` (the real
  @payloadcms/ui exports — `useWatchFormFields` does not exist) → renders the
  template's inputs, values bound into the sibling `specsJson` field via `useForm`.
- `category` is a relationship **id** in form state, not a slug — the field
  resolves id→slug via the categories in index/props or a `component-categories`
  lookup, then `specTemplateFor(slug)`. Writes happen only on user edits — never
  on mount (a mount-time setValue would dirty every edit form).
- Selects render as dropdowns with `options`; numbers get `unit` suffix labels.
- `specsJson` keeps its raw field, moved into a collapsed "Advanced (raw JSON)"
  row. Keys not in the template are preserved and shown under "additional specs" —
  never hidden, never stripped.
- No hard validation — cosmetic data guides but must not block a save.
- Changing category does NOT wipe existing `specsJson` (template just renders what
  applies; leftovers stay under "additional specs").

Rule-critical collapsible stays flat (typed DB fields must remain native for
query/validation). Clarity fix only: per-field `admin.description` naming the
categories each field applies to (e.g. socket → "CPU, motherboard").

Display: `specLabel()` feeds the **builder-index `display.specs` chips** so "12"
renders as "VRAM · 12 GB" instead of `vram: 12`. The PDP spec table is **out of
scope** — it reads `products.specsJson` (a plugin-shop field keyed by *shop*
category, unpopulated in the seed), a different axis from component-category
templates; product-side label resolution is follow-up work, not this spec.

Drift guard test: every `specsJson` key in `seed-data.ts` must exist in its
category's template, and every template type must match the seeded value's type.

## B. Derived rules

New module `packages/plugin-pc-builder/src/lib/derived-rules.ts`. Pure function:
component rows (+ category slugs) → rule rows in the exact shape
`buildBuilderIndex` already feeds `evaluate`. Engine untouched.

Synthesis table (per component, only when its source spec is populated).
**Every relation emits explicit per-direction rows** — the engine's `bi` flag is
NOT used for synthesis: its reverse mirror reuses the forward message with a
swapped `componentA`, producing garbled wording (e.g. an excluded CPU under a
selected mobo would read "…uses socket AM5 but the selected motherboard does
not" naming the *mobo*). The seed's hand-written reverse rows exist precisely
for correct wording; synthesis mirrors that.

| Source | Synthesized rows (forward + reverse) |
|---|---|
| cpu/mobo `socket` | cpu→mobo requires `socket` equals `<cpu.socket>`; mobo→cpu requires `socket` equals `<mobo.socket>` |
| ram/mobo `ramType` | ram→mobo requires `ramType` equals `<ram.ramType>`; mobo→ram requires `ramType` equals `<mobo.ramType>` |
| mobo `moboFormFactor` | mobo→case requires `caseSupportedFormFactors` contains `<mobo.moboFormFactor>` |
| case `caseSupportedFormFactors` | case→mobo requires `moboFormFactor` **in** `<case.caseSupportedFormFactors>` (`in` op + array value — `satisfiesOperator` already supports `expected.includes(actual)`, rule-engine.ts:166) |
| gpu `gpuLengthMm` | gpu→case requires `caseGpuMaxLengthMm` gte `<gpu.gpuLengthMm>` |
| case `caseGpuMaxLengthMm` | case→gpu requires `gpuLengthMm` lte `<case.caseGpuMaxLengthMm>` |
| cpu `socket` | cpu→cooling requires `coolerSocketSupport` contains `<cpu.socket>` — **forward only**: the engine's dynamic mirrors compare the same `rule.field` on both sides, and CPUs have no `coolerSocketSupport`, so a cooler→CPU direction is inert by engine design (pre-existing: today's seeded `bi:true` cooler rules already do nothing in reverse). Not promised here; needs engine changes if ever wanted. |
| storage `storageInterface` = `NVMe` | drive→mobo requires `storageInterface` equals `'NVMe'` — **NVMe only**: a SATA drive synthesized as `requires equals 'SATA'` would block every motherboard (all carry `storageInterface:'NVMe'`, meaning "has an M.2/NVMe slot") and 422 every saved build containing it. SATA drives get no requires row; the "NVMe is faster" advisory stays authored. |
| gpu `pcieVersion` | **not synthesized** — `pcieVersion` is a string (`'4.0'`) while `gte`/`lte` are numeric-only, so the seeded warns fire on *every* motherboard today (pre-existing bug; see Found Issues). Synthesizing would reproduce the noise. Fix = numeric pcieVersion or drop; follow-up. |
| **psuWatts** | **not synthesized** — under-sizing is already global via `derived-power-rules` + `checkPowerEnvelope`. The four seeded per-PSU GPU-draw warns (`RM650x ↔ GPU ≤250W`…) are tuned per-product thresholds the envelope cannot express → **stay authored**, not dropped. |

Notes:

- `value` is copied from the component's own spec at synthesis time (same shape as
  hand-authored literal values).
- Messages come from a `fieldMessages` template map keyed by rule kind
  (socket/ramType/ff/gpuLength/cooler/storage) **per direction**, producing
  today's wording ("{componentA} uses socket {socket} but the selected
  motherboard does not." / "{componentA} has an AM5 socket but the selected CPU
  does not.").
- Dedupe: a synthesized row is skipped if an authored rule with the same
  (subjectKind, subject, target, field, op, value) key exists — authored rules
  win. Caveat: semantic twins of different shape (authored `excludes gte 281` vs
  synthesized `requires lte 280`) are NOT deduped — on the stale dev DB,
  double-reporting is expected transition noise until reseed; acknowledged, not
  blocking.
- Fields absent from a category's specs are engine-safe (`violates()` returns
  false when `candidate.specs[rule.field]` is undefined), so a synthesized row
  naming a field a category lacks is a no-op.
- Seed simplification: drop the ~30 hand-authored standard rows; keep genuine
  specials — 2000D↔4080-Super targeted rule, category-level PSU-wattage
  advisory, the four per-PSU GPU-draw warns, the SATA/NVMe advisory.

Live-DB benefit: synthesis reads typed fields (populated today), so compat
correctness lands on the stale dev DB without a reseed.

## C. Platform path

**Derivation** (index-build time, no stored field):

```ts
export const SOCKET_PLATFORM: Record<string, 'amd' | 'intel'> = {
  AM5: 'amd', LGA1700: 'intel', LGA1851: 'intel',
}
```

- cpu/motherboard: `platform = SOCKET_PLATFORM[socket]` (undefined → `any`).
- cooling: platform *set* from `coolerSocketSupport` (cross-socket coolers appear
  on every path they cover).
- ram: **no platform tag** — mobo-bound, not socket-bound. Cleared on path switch;
  filtered by ramType-of-visible-mobos (below).
- gpu/psu/case/storage/os/case-fan: `any` — always visible.

`ComponentSpecEntry` gains `platform` (single platform | 'any') and
`platforms` (cooling's set) — or one normalized `platforms: string[]` field;
decide at implementation.

**Path-visibility (hard filter)**, given active path P with socket set S(P):

| Category | Visible when |
|---|---|
| cpu, motherboard | `socket ∈ S(P)` |
| cooling | `coolerSocketSupport ∩ S(P) ≠ ∅` |
| ram | `ramType ∈ ramTypes(visible motherboards)` — if no mobo picked yet, use all in-path mobos |
| all others | always |

Index surfaces `platforms: [{ id:'amd', label:'AMD', sockets:['AM5'] }, …]`
derived from SOCKET_PLATFORM ∩ sockets actually present in data (an Intel path
with zero Intel parts hides itself).

**Store** (`builder-store`): `path: 'amd' | 'intel' | null`, `setPath(p)`.
Required wiring the checklist caught:

- Add `path` to `builderDraftPartialize` **and** `builderDraftMerge` — the draft
  whitelists fields, so a bare new key silently won't persist.
- `startFresh`/`applyTemplate` must reset `path` — otherwise a stale path leaks
  into a fresh build or a template-applied draft.
- `setPath` to a different value clears the four bound slots
  (cpu/motherboard/ram/cooling) via existing `clearSlot`; a confirm dialog
  ("Switching to Intel clears CPU, motherboard, memory and cooling") precedes it.
- `?path=amd|intel` hydrates on load. Path inference for restored builds happens
  **off restored selections post-index-load** (look at the selected CPU's/mobo's
  socket), NOT off URL params — required because `LandingClient`'s "Use this
  build" calls `applyTemplate` then navigates with no `?template=` param, and the
  share-page "Duplicate this build" flow lands on `?build=` anyway.

**UI**:
- `/builder` landing: three path cards — AMD builds / Intel builds / No
  preference — linking to `/builder/configure?path=…` (`?path=` omitted for
  no-preference).
- In-builder: a persistent chip in the header strip (studio) / segmented control
  (classic) showing the active path; click → switch dialog.
- Option modals: when a path is active, bound-category option lists apply the
  path-visibility filter before rendering (non-matching rows are absent, not
  disabled — the path already explains why).
- Provider owns the state; `BuilderContextValue` gains `path`/`setPath`/`platforms`
  so any registered design can render it.
- **Provider-level filtering, not modal-level**: both designs already consume
  `meta.optionRows`/`meta.optionsFor` — applying path-visibility inside the
  provider's option computation covers classic, rig-studio, and every future
  registered design for free.

## D. Test surface

- `spec-templates.test.ts` — registry↔seed drift guard; `specLabel` units.
- `derived-rules.test.ts` — golden synthesis from fixture rows; dedupe vs an
  authored twin; **the core proof**: evaluate a build with authored socket rules
  removed → LGA board still disabled under an AM5 pick; form-factor, GPU-length,
  cooler, NVMe-storage cases; **SATA drive must NOT synthesize a requires row**.
- `builder-index.test.ts` — `platform`/`platforms` derivation; `platforms` index
  section.
- `builder-store` (or kit) test — `setPath` clears exactly the four bound slots;
  `?path=` hydration; path inferred from restored build.
- `pathVisible` pure-fn tests incl. cross-socket cooler on both paths and the
  "RAM filtered via in-path mobos" case.
- e2e (`rig-studio.spec.ts` extension): land `?path=amd` → mobo modal lists only
  AM5 boards; pick cpu+mobo, switch path via chip → confirm clears the picks.
- Seed: `seed-data.test.ts` updated for the shrunken authored-rule table.

## E. Explicit non-goals

- No rule-engine changes; synthesized rows are existing rule shapes.
- No `specsJson`→typed-field migration; no spec-defs collection.
- No per-component derived-rule opt-out; no admin "auto-generate rules" button.
- Path is never mandatory; "No preference" keeps today's behavior (derived rules
  still enforce physics there).
- specsJson stays display-only — synthesized rules read typed fields only.

## Found during review — pre-existing engine bugs (not caused by this spec)

- **PCIe warns fire unconditionally**: `warns` rules always surface as
  `severity:'warning'` in `evaluate`/`validateSelections` (declared `info` is
  ignored), and `gte` on the string `'4.0'` fails numeric comparison → every mobo
  reports the PCIe note today. Follow-up: numeric `pcieVersion` spec or drop.
- **Cooler `bi` is inert**: reverse mirrors compare the same field on both
  subjects; CPUs lack `coolerSocketSupport`, so a pre-selected cooler constrains
  nothing. Cross-field bidirectionality needs an engine feature, not rules.
- **Stale-DB double-report**: semantic twins (authored `excludes gte 281` +
  synthesized `requires lte 280`) both fire on the current dev DB until reseed —
  cosmetic noise in issue counts, not a correctness break.

## Open implementation details (resolved during build, not design)

1. `platform` field shape on `ComponentSpecEntry` (`platform` + `platforms` vs one
   normalized array).
2. Exact admin binding (`useForm().setValue` on `specsJson`, edit-only writes) and
   whether `SpecFieldsField` lives above the raw field or replaces it in the
   sidebar.
3. `fieldMessages` template table — final wording per rule kind × direction
   (mirror today's authored phrasing).

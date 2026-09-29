# 04 · Collections — Compatibility Rules

## CompatibilityRule

The heart of the builder. Fields:

| Field | Type | Notes |
| --- | --- | --- |
| subjectType | select: component / category | |
| subjectComponent | rel → components (indexed) | when subjectType=component |
| subjectCategory | rel → componentCategories (indexed) | when subjectType=category |
| targetType | select: component / category | |
| targetComponent | rel → components (indexed) | |
| targetCategory | rel → componentCategories (indexed) | |
| type | select: requires / excludes / supports / warns | semantics below |
| operator | select: equals / in / gte / lte / contains | |
| field | text | spec key the rule inspects on the target's typed specs, e.g. `socket` |
| value | text (JSON-encoded for `in`/`contains`) | condition value(s) |
| severity | select: error / warning / info | error = hard block, warning/info = advisory |
| bidirectional | checkbox (default false) | true → rule auto-mirrored subject↔target at load time |
| message | textarea | token interpolation: `{componentA} uses socket {socketA} but {componentB} requires {socketB}` |
| enabled | checkbox | admin can mute rules without deleting |

**Type semantics**

- `requires` — if subject is selected, target selection must satisfy condition (operator+field+value). Severity error → invalid combo blocked.
- `excludes` — if subject is selected, targets failing the condition are blocked (inverse of supports).
- `supports` — positive whitelist: subject is only compatible with targets satisfying the condition.
- `warns` — same evaluation but severity forced to warning; never blocks.

**Bidirectionality**: rules are authored one-directionally; `bidirectional: true` mirrors the rule in the engine's in-memory index at load (CPU→motherboard AND motherboard→CPU without duplicate docs). A2: mirroring at load, not storage, avoids admin confusion about duplicates.

**Message tokens**: interpolated at evaluation from `{componentA|B}` (names) and `{key}` = the violating spec value of the failing component. Interpolation is in the engine (`packages/lib`), fully testable.

Access: public read (engine needs rules client-side), admin/manager write. Hooks: `afterChange` → rebuild server rule index + bump `rulesVersion` cache tag; validation snapshot versions on ConfiguredBuild record which rulesVersion was applied (stale rules trigger re-validation on next view).

## DerivedPowerRule

| Field | Type | Notes |
| --- | --- | --- |
| targetCategory | rel → componentCategories (psu) | the slot the requirement applies to |
| overheadMultiplier | number (default 1.3) | configurable global (A7) |
| baseWatts | number (default 100) | |
| severity | select: error / warning (default warning) | default advisory; admin can harden |

**Formula (configurable global, stored on the rule doc):**
`requiredWatts = sum(selected components' tdpWatts) * overheadMultiplier + baseWatts`
Evaluation: if a PSU is selected and `psuWatts < requiredWatts` → warning "PSU insufficient: system draw ~X W, PSU rated Y W — pick ≥ Z W". If no PSU selected yet → builder shows live "recommended PSU: ≥ Z W" chip.

> **Status (2026-09-28)**: `targetCategory` + `severity` are honored end-to-end (progress-log entry 10). The engine previously hard-coded the `'psu'` id and never fired on real numeric category ids; `buildBuilderIndex` now passes both fields through (depth-1 rel → id + slug) and `createRuleEngine` resolves the target slot (`targetCategoryId` → slug → legacy `'psu'`). Severity `error` routes the power issue into `validateSelections.errors` (blocks save/checkout); default stays advisory. Live probe: i7-14700K + RTX 4070S + RM650x → "PSU insufficient: system draw ~715 W … 650 W".

## Admin UX (key differentiator)

- **"Compatibility Rules" custom admin view** (registered via the plugin's `components.views`): spreadsheet-like grid — columns: Subject, Type, Operator, Field, Value, Target, Severity, Enabled. Inline editing, row add/duplicate, filter by category pair, severity color chips from design tokens. Bulk import: CSV upload (`subject,subjectType,type,operator,field,value,targetType,targetCategory,severity,message`) with zod validation + preview diff before commit. Export CSV too. **Status**: the view exists at `/admin/compatibility-rules-manager` with import/export and a sidebar nav link (`admin.components.afterNavLinks` + importMap, entry 10); inline edit, row add/duplicate, filter, and CSV import preview-diff with Confirm/Cancel landed in entry 14 (along with the export-name vs resolve-slug round-trip fix, TDD #67–69/#74–76).
- **Per-component conflict field**: a custom React field on the Component edit view (registered as `components.fields` by the plugin) — live table "This component conflicts with / is required by", querying `GET /api/builder/rules/conflicts?componentId=…` and showing the exact rule + interpolated message per conflict. It re-queries on component spec change, so editing `socket` instantly shows new conflicts. UX: collapsible panels grouped by target category; each row links to the conflicting component's edit view.

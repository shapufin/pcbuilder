# 02 — PC builder: rule engine, data shapes, admin

Canonical docs: `docs/buildmyrig-plan/06-rule-engine.md`,
`04-collections/builder-collections.md`, `05-plugin-contracts.md`. Plugin boundary:
`packages/plugin-pc-builder` must NOT import shop internals or
`apps/web` — they meet only at defined integration points (cart item
type). Enforced by `no-restricted-imports` (`pnpm lint`).

## Rule engine (`packages/lib/src/rule-engine.ts`)

- Pure, dependency-free, used identically server-side (checkout
  validation/price) and client-side (filtering). No new deps without
  strong reason; `packages/lib` stays framework-free.
- **A8 asymmetric-mirror skip** (tests `#89–90`): bidirectional mirror
  rules (e.g. CPU socket ↔ `coolerSocketSupport`) must **skip when
  either side lacks the mirrored field** — the entry-15 bug was the
  dynamic mirror blocking every CPU+cooler save. Both mirror paths carry
  the skip; never make one side stricter than the other.
- Rules load once server-side and are cached via the builder index —
  evaluation stays O(components), not O(components × rules).

## Data-shape traps (the big one)

- **`build-templates` store a SINGULAR `component` per slot;
  `configured-builds` use `components[]`.** Mixing the shapes silently
  created empty price-0 builds (entry-15 `#91/92`). The use-template
  endpoint (`builderUseTemplateEndpoint`) accepts both and 400s on
  empty — keep it that way.
- `BlockSlug` is `string[]` inside plugin packages but a generated union
  in `apps/web` (augmented `Config.blocks`) — slug arrays crossing the
  boundary need `as never` at the field (`blockReferences`,
  `filterOptions`).

## Builder index / caching

- `packages/plugin-pc-builder/src/lib/builder-index.ts`: 30 s cached
  component/spec index + composite `rulesVersion` (`#64–66`);
  invalidation hooks on rule/component writes. A rule change that does
  not bump `rulesVersion` is a bug — check the hook chain.

## Admin surfaces

- `src/admin/RuleManagerView.tsx` — spreadsheet grid: inline edit,
  add/duplicate, CSV import with preview-diff + Confirm/Cancel.
  **Round-trip trap** (`#74–76`): export writes rule *names*, import
  resolves *slugs* — keep the name↔slug mapping symmetric or import
  silently mismatches.
- `src/admin/BuildStatsView.tsx` + staff-readable
  `/api/builder/stats` (`src/lib/build-stats.ts`).
- CSV import supports `dryRun` (`src/lib/rule-import.ts` via
  `src/endpoints.ts`).

## Builder endpoints (`src/endpoints.ts`)

- `builderClaimBuildEndpoint` — guest→account claim: 401 unauth,
  403 wrong-owner, idempotent on re-claim (`#85–86`).
- `builderUseTemplateEndpoint` — see shape trap above.
- Save-to-account: builder store must clear `buildId`/`shareId` on any
  selection mutation (entry-16 `#93–94`) or the UI claims a stale save.

## Verify

- `pnpm test` — `packages/lib` (67) + `plugin-pc-builder` (52) suites.
- Live probe after rule changes: save a CPU+cooler build (the A8
  regression), use a template (empty must 400), CSV export→import
  round-trip one rule.

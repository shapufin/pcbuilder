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

## Builder designs (entry 50 P0 — RIG Studio megaplan)

- **"builder design"** = the swappable /builder/configure renderer
  (`classic`, `rig-studio`…); NOT `build-templates` (hardware presets).
- `src/lib/builder-designs.ts` — `BUILDER_DESIGNS` slug registry,
  `builderDesignOptions()` (admin select), never-throw
  `resolveBuilderDesign()` (own-prop check, #305); default `rig-studio`
  since the P4 flip (entry 54, #363). `apps/web` maps slug → component in
  `app/builder/designs.ts` (P2) and reads the global via
  `apps/web/src/lib/builder-settings.server.ts` `getBuilderDesign()`
  (never-throw, like `getSiteSettings`).
- `src/globals/builder-settings.ts` — plugin-owned global (public read /
  manager write); `BuilderSettingsNavLink` in `afterNavLinks` needs a
  `generate:importmap` after plugin admin changes.
- **P2 architecture (entry 52)**: `app/builder/builder-provider.tsx` owns
  index fetch + hydration + `?template=`/`?build=` (+rgbColor) + engine +
  `resolveSlotLimits` + loading/error renders; designs consume
  `useBuilder()` (`state`/`actions`/`meta` incl. `actionStatus` — never
  re-instantiate `useBuildActions` inside a design). `actions.select`
  resolves `limits[cat]?.max ?? maxSelectable` — spec caps bind in every
  design. `app/builder/designs.ts` maps slug → component (`rig-studio`
  via `next/dynamic`, code-split; parity test #331); `configure/page.tsx`
  → `getBuilderDesign()` → `BuilderShell`. Design kit in
  `app/builder/kit/`: `useBuildActions` (save/claim/cart/share, POST body
  sends `rgbColor`), `option-rows`, `build-io`, `BuilderToasts`.
  `builder-store.rgbColor`/`setRgbColor` is cosmetic — does NOT clear
  buildId/shareId (#93). Cap-shrink: existing picks persist until the
  next add, then evict-oldest down to `max` (store contract).
  `SummaryClient` is OUTSIDE the provider — it calls `useBuildActions`
  with its own `useBuilderIndex`.
- **P3 (entry 53)**: `app/builder/designs/rig-studio/` is the full
  RIG_model1 port — pure `useBuilder()` presentation, no
  index/engine/fetch/store imports inside the dir (verified by review
  grep). Layout: `index.tsx` lifts view/hoverZone/toggles/modal state;
  `StudioBay`+`StudioSlotCard` (search, `slotCode` labels, resolved
  `limits` n/max, `cappedBy`); `StudioSwapModal` (`meta.optionRows`,
  focus-restore+scroll-lock); `RigBlueprint` (8 `ZONE_BY_SLUG` zones,
  spec-only labels, ghost sockets, keyboard-activatable);
  `StudioToolbar` (x-ray/heatmap/RGB + `RGB_PRESETS`→`setRgbColor`);
  `MetricPills`/`PsuTelemetryCard`/`BuildPriceCard`/`CompactMatrixView`
  (matrix covers unmapped slugs). `studio-lib.ts` pure layer (#332–352);
  `rig-studio.css` ~1900 LOC **fully `.bdesign-rig-studio`-scoped**
  (enforced by `css-token-purity` `APP_CSS`) — when adding rules they
  must carry the prefix, incl. inside `@media`. `--rgb-accent` is a
  runtime custom property on the design root (legal under hex ban).
  Deliberate: no whole-card click (nested buttons); no category-pill
  filter (search covers). Deferred: modal focus-trap.
- **P4 (entry 54)**: `DeployModal` real pipeline — stage 1
  `engine.validateSelections` (errors block), stage 2 power envelope
  (`recommendedPsuWatts` vs picked `psuWatts`, errors block/warnings
  pass), stage 3 `ensureSavedBuild()` + `buildManifest` (real lines:
  name/parts/watts/total/share URL), stage 4 `addToCart` → final CTA
  "View cart". `kit/deploy-checks.ts` = pure helpers (#353+);
  `kit/saved-refs.ts` = guest `bmr_studio_builds` localStorage refs
  `{shareId,name,savedAt,priceCents}` (never-throw wrappers).
  `SavedBuildsModal` 3 tabs — My Builds (auth: REST
  `/api/configured-builds?limit=50&depth=2&sort=-updatedAt` owner-read;
  guest: refs → load via `/builder/builds/:shareId` + `applyTemplate`),
  Architect Presets (`meta.templates`), Export/Import (`build-io`
  round-trip incl. `rgbColor`; invalid IDs → toast). `saveToAccount`
  accepts an optional name; guest save writes a ref with the real
  server `shareId`. **Default flip**: `DEFAULT_BUILDER_DESIGN =
  'rig-studio'` — resolver + `BuilderShell` fallback both land there;
  `classic` still renders when explicitly picked. Seed §7 enriched:
  `specsJson` cosmetic specs (vram/cores/chipset/efficiency/radSizeMm…),
  `hasRgb` flags, mobo `ramSlots`/`m2Slots` (ITX 2/2, ATX 4/3),
  ram/storage `maxSelectable` → 4; `BuilderSpec` widened
  (bool + `Record<string, unknown>`). Invariants #359–#362.
- `packages/lib/src/slot-limits.ts` — `resolveSlotLimits()` caps picks
  by host spec (`SLOT_LIMIT_RULES`: mobo `ramSlots`→`ram`,
  `m2Slots`→`storage`; keyed by category ID internally; integer specs
  only). **Client-enforced only** — REST saves get non-blocking
  `validationSnapshot` warnings via `findOverCapWarnings()`
  (`lib/builds.ts`); a server hard-block is future engine work.
- **Duplicate slot rows aggregate**: `findIncompleteSlotReasons`,
  `findOverCapWarnings`, `slotsToSelections` all sum per-category
  (last-wins let two sub-max rows evade every check — review round).
  Cart resolution (`resolveConfiguredBuildLine`) re-merges over-cap
  warnings into its rewritten snapshot.
- `components.hasRgb` (Studio display collapsible → `display.hasRgb`),
  `ramSlots`/`m2Slots` (rule-critical → `specs`),
  `configured-builds.rgbColor` (serverManaged; hex-6 schema, save
  endpoint + share response thread it).
- `packages/lib/src/rgb-presets.ts` — `DEFAULT_RGB_ACCENT`/`RGB_PRESETS`
  live here: `apps/web` `no-raw-hex` bans hex literals in `src/**`.

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

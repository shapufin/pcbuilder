# Builder themes / designs — audit round 1

- **Date:** 2026-10-24
- **HEAD:** `66d2ff7` (working tree dirty from entries 127–130, left untouched)
- **Baseline:** 938 tests green (lib 93, pc-builder 128, pages 51, shop 172, web 492, ui 2)
- **After:** 954 tests green (lib 97, pc-builder 131, pages 51, shop 172, web 501, ui 2); typecheck 0, lint 0 errors
- **Surface:** `BUILDER_DESIGNS` registry, `builder-settings` global, `apps/web` design registry, `/builder/configure`, both design stylesheets, the two supplied mockups.

## What existed before this round

| Design | State |
|---|---|
| `classic` | wizard, theme-inherited, unchanged |
| `rig-studio` | port of **PC_BUILDER_ARCHITECT_DESIGN** (~90% of rendered components) |
| `atelier` | **absent** — `PC_BUILDER_ATELIER_DESIGN` had never been ported (zero source references) |

Dead files in the Architect mockup (`TelemetrySidebar`, `TuneModal`, `ExplodedHudView`) are never imported there — nothing was lost by not porting them.

## Resolved findings

| # | Sev | Finding | Fix |
|---|---|---|---|
| B1 | HIGH | Blueprint illegible in every theme: part fill **1.09:1 dark / 1.05:1 light**, zone stroke **2.12 / 2.45** (needs 3:1) | `--bd-*` ramp from `packages/lib/builder-palette.ts`; paints remapped. Now **1.93 / 1.63** fill, **4.30 / 3.54** stroke |
| B2 | HIGH | Two headers (site 65px + studio 62px), two brands, two banner landmarks | Immersive chrome for `/builder/configure` (`lib/chrome.ts` + pre-paint script + CSS); design header carries back-to-store |
| B3 | MEDIUM | Chip said "7 issues — check clearances" for empty required slots | Chip now separates clearance errors / missing slots / warnings |
| B4 | MEDIUM | `MetricPills` rendered an empty band on a fresh build | Designed empty state |
| B5 | MEDIUM | 28px horizontal overflow at 280px | `min()` grid track + wrap rules; **0px** at 280 |
| B6 | MEDIUM | No `h1`; "Saved builds" mixed into the view nav with no `aria-pressed` | `h1.sr-only`; saved builds moved to header actions |
| A2 | MEDIUM | `RENDERER_LABELS` was a hand-kept copy; option count went stale | Derived from `BUILDER_DESIGNS` via new `./designs` subpath export |
| A4 | HIGH* | No palette policy — a design could not keep its ladder without ignoring the theme | `palette: 'inherit' \| 'accent'` in the registry; `accent` mounts `--bd-*` |
| C1 | LOW | `classic` `h1` is the step name ("CPU") | Deferred (see backlog) |
| A1 | MEDIUM | Admin picker is a bare select, no preview | Partially addressed: descriptions in the registry; gallery deferred |

\* relative to the stated requirement, not a pre-existing defect.

## Added

- **`atelier` design** (`designs/atelier/`): editorial studio (63/37 split, vector stage with live hotspots, atmosphere + perspective presets) and the Architectural Blueprint screen (5 subsystem layers, clearance cards), swap sheet, commission sheet on the real `addToCart` pipeline. `atelier.css` is token-only and in `css-token-purity`.
- **Shared kit** (no cross-design imports): `kit/part-lib.ts` (was `rig-studio/studio-lib.ts`), `kit/ModalShell.tsx` (was `StudioModalShell`), `kit/modal.css` (dialog chrome, was scoped to `.bdesign-rig-studio` — which is why a second design rendered unstyled dialogs).

## Verified in the browser

- 1440 + 280 on both designs, dark and light presets: 0px page overflow.
- Theme inheritance: `--color-primary #0070f3` → CTA, `--color-accent #00eefc` → accents, in both designs.
- Design switch: `POST /api/globals/builder-settings` → next render shows the new design (no cache layer).
- Contrast ratios above measured live via `getComputedStyle` on the rendered SVG.

## Backlog (deliberately deferred)

1. Admin design **gallery with previews** (currently a select + descriptions).
2. `classic` heading semantics (`h1` = step name).
3. Product imagery in the builder (catalog has none; both mockups lean on photos).
4. Category filter pills in `rig-studio` (deliberate deviation, search covers it).
5. Modal focus **trap** (Tab can still leave the dialog) — pre-existing.
6. `atelier` has no saved-builds browser (mockup has none); commission flow still saves the draft server-side.

## New finding, outside the theme scope (not fixed)

- **`classic` build rail shows the same engine warning four times**
  ("Intel Core i5-14600K is PCIe 4.0; this board runs PCIe 4.0.") with equal
  versions on both sides — i.e. a warning that should not fire, repeated once
  per slot. Not caused by this round (engine/rules untouched); needs a
  derived-rule + warning-dedup pass in the rule engine. Severity MEDIUM.

## Round 1b — live user simulation (same day)

Driven with Playwright against the dev server: 7 presets × 3 designs × 5 widths
(1440/1024/768/390/280), then the full purchase journey on each design.

| Check | Result |
|---|---|
| Horizontal overflow | **0px** in all 105 cells |
| Visible `<header>` / `<h1>` | exactly 1 each, everywhere (site header `display:none` under immersive) |
| CTA contrast | ≥4.55:1 in every preset |
| Blueprint edge contrast | ≥4.94:1 in every preset |
| Build journey (rig-studio) | 8 parts → €1,542 → matrix 9 rows → deploy 4/4 stages → "cart updated" |
| Build journey (atelier) | 8 parts → €1,542 → 3 clearance cards → commission → cart |
| Build journey (classic) | every step → review → add to cart |
| Cart | "Configured build · 8 parts", €1,542.00, server-computed |
| Page errors | none |

### Defects found by the simulation (all fixed)

| # | Sev | Finding | Fix |
|---|---|---|---|
| S1 | HIGH | `body[data-chrome]` set pre-paint caused a React **hydration mismatch** on every builder load | `suppressHydrationWarning` on `<body>` (same pattern as `<html>`) |
| S2 | HIGH | **8 "warnings" on a valid build**: `result.warnings` is the per-*candidate* badge dataset (a `warns` rule flags every candidate in the category), but the chip, the classic rail and the summary rendered it as build warnings | chip/rail/summary now use `validateSelections(current).warnings`; `result.warnings` stays for option-card badges. Chip: 8 → 2 |
| S3 | MEDIUM | `aether-frost` CTA **3.19:1** — white on amber primary | `onPrimary` → `#09090b` (6.24:1) |
| S4 | MEDIUM | Precision Dark CTA **4.37:1** (white on `#6468f2`) | primary → `#5f63ee` (4.66:1), glow/soft re-tinted |
| S5 | LOW | classic wizard **2px** overflow at 280px (search input `min-width: 220px`) | `min(220px, 100%)` + `minmax(min(220px,100%),1fr)` grids |
| S6 | LOW | Atelier swap sheet toasted "installed" when clicking an installed row (store toggles it **off**) | deselect path toasts "removed", no close |

### Rule-data defects found, NOT fixed (needs your call)

> **Resolved in round 1c** — the root cause was in the engine, not the seed:
> `gte`/`lte` only accepted real numbers, so a string `pcieVersion` made every
> candidate "unsatisfied" and the `warns` polarity turned that into a warning
> on **every** board (including an exact match). Fixed by coercing numeric
> strings in `satisfiesOperator` + treating a numeric operator on a
> non-numeric spec as "no violation" in `violates`. Tests #694–#698. The seeded
> rows are untouched and now behave as authored: a 3.0 board with a 4.0 CPU
> warns, equal versions do not. The only warning left on a full build is the
> legitimate SATA advisory.

## Round 1c — follow-ups (same day)

| Change | Evidence |
|---|---|
| **Engine**: numeric-string coercion for `gte`/`lte`; non-numeric spec under a numeric operator is not a violation | `packages/lib/src/rule-engine.ts`; new `rule-engine.version.test.ts` (#694–#698); chip 2 → **1 warning** (the SATA one) |
| **classic heading**: page `h1` is now "Configure your build" (sr-only); the step is `h2` | live: `h1=1` (sr-only), `h2=[CPU, Your build]`, 0 overflow |
| **Admin**: design field description generated from the registry ("Available: Classic wizard · RIG Studio · Atelier") | live admin render |
| **Admin gallery — dead end, documented**: a card picker as `admin.components.Field` on this global has **no form context** (`useFormFields` returns `{}`, `dispatch` is a no-op, `useField` throws during SSR → 500). Reverted. A clickable gallery needs a `ui` field with its own `FieldProvider`, or an `elements` component that saves via REST. | reproduced 3×; reverted, import map clean |

## Scorecard

| | Round 1 |
|---|---|
| CRITICAL | 0 |
| HIGH | 3 (all fixed) |
| MEDIUM | 6 (5 fixed, 1 deferred) |
| LOW | 1 (deferred) |
| False positives | 0 (all CRITICAL/HIGH proven in code + browser) |
| Fix rate | 8 / 10 |

## Round 1d — shared kit, focus trap, admin catalogue (same day)

| Change | Evidence |
|---|---|
| **SavedBuildsModal → `builder/kit/`** — the 516-line manager now lives in the kit; `rig-studio/SavedBuildsModal.tsx` is a one-line re-export and Atelier opens the same modal | live: opens in Atelier as "Rig Build Manager", wide panel, all 3 tabs |
| **Dialog focus trap** — `kit/focus-trap.ts` (pure `nextTrapIndex` + DOM `focusables`) wired into `ModalShell` and `StudioSwapModal`; Tab/Shift+Tab wrap, Escape close, focus restore | tests #699–#703; live: 7 real Tabs inside a 55-focusable dialog, focus never left the panel |
| **Visibility check hardened** (review fix): `offsetParent` missed `position:fixed` and included `visibility:hidden` → layout-box check (`offsetWidth/offsetHeight/getClientRects`) | `focus-trap.ts` |
| **Read-only renderer catalogue** in `BuilderSettingsHeader`: every registry design with palette mode + Active marker. Active state now matches by **slug** (`currentDesign` state), not label; redundant `Object.entries` cast removed (typed via `Object.entries<BuilderDesignDef>`) | live admin: 3 cards, "Atelier — Active", select intact, 0 page errors |
| **`ui`-field probe confirmed the dead end** (`keys=0`) and was removed: `DesignPickerProbe.tsx` deleted, field registration gone, import map + `payload-types.ts` clean | grep: only stale `.next` cache references |
| **Component thumbnails wired** to `display.image` (rig-studio swap rows, Atelier swap sheet, Atelier slot icons) — render only when the catalog has a real image. Live data has 0 component images, so rows keep current look; `<img>` matches the existing `OptionCard`/`ProductGallery` convention | 3 `no-img-element` warnings are convention-consistent |

Gates after 1d: `pnpm test` **964** (lib 102 · pc-builder 131 · pages 51 · shop 172 · web 506 · ui 2), `pnpm -r typecheck` 0, `pnpm lint` 0 errors / 11 warnings (3 new `no-img-element`, convention-consistent), `pnpm workflow:check` PASSED.

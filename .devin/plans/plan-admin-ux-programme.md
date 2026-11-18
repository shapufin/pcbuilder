---
created: 2026-10-22
status: awaiting-review
scope: admin UX programme (editor legibility, saved views, theme-resolved blocks, edit speed)
baseline-commit: 4383379
supersedes: nothing (new programme)
---

# Admin UX Programme — implementation plan

**Goal:** make the Payload admin faster and more legible for the people who actually
use it — editors building pages, merchandisers editing products, and whoever maintains
the rule engine — without forking Payload or replacing views that already work.

**Architecture:** four phases, each independently shippable and reviewable. Phase 1 and 2
use Payload features we already have installed but never switched on. Phase 3 adds one
small resolution layer to the existing block renderer so a theme pack can *override* a
block instead of multiplying block types. Phase 4 is speed and safety, and is optional
if 1–3 land well.

**Tech stack:** Payload 3.90.2, Next 16.3.8, React 19, plain CSS + tokens, vitest 5.

**Spec / research:** this document §"Why these four" + `.devin/audits/full-app-2026-10-22/`
+ the Payload docs cited inline. No external spec doc — the research is in §10.

---

## 1. Measured baseline (do not re-derive)

| Fact | Value | Source |
|---|---|---|
| Tests | 901 passing (lib 93, ui 2, shop 163, pc-builder 127, pages 51, web 465) | `pnpm test` at `4383379` |
| Typecheck / lint | 0 errors / 0 errors + 8 pre-existing warnings | `pnpm -r typecheck`, `pnpm lint` |
| Block types registered | 28 (18 shared, 4 `nexus*`, 6 `aether*`) | `apps/web/src/blocks/registry.tsx` |
| Block admin metadata in use | `admin.group` only | `packages/plugin-pages/src/blocks/*.ts` |
| Block row labels | **none** (`admin.components.Label` never set) | grep: 0 hits |
| Block drawer thumbnails | **none** (`imageURL` never set) | grep: 0 hits |
| `enableQueryPresets` | **not used anywhere** | grep: 0 hits |
| `trash` | **not enabled** on any collection | grep: 0 hits |
| `versions.drafts.autosave` | **not enabled** | `Pages.ts:16`, shop `index.ts:133` |
| Admin horizontal overflow @280 | 0 (15 routes), 5px (product edit) | audit round 1 |
| Storefront pictographs | 0 | `4383379` |

**Verified API shapes in our installed 3.90.2** (checked in `payload/dist`, not from memory):

- `CollectionConfig.enableQueryPresets?: boolean` — `collections/config/types.d.ts:507`
- `CollectionConfig.trash?: boolean` — `collections/config/types.d.ts:615`
- `versions.drafts.autosave?: Autosave | boolean`; `Autosave = { interval?: number /* default 800 */, showSaveDraftButton?: boolean }`
- `Block.admin.components.Label?: PayloadComponent<any, any>` (untyped props — see Task 1.1 probe)
- `Block.admin.imageURL?: string`, `imageAltText?: string`, `disableBlockName?: boolean`, `group?: string | Record<string,string>`

---

## 2. Why these four (and not something else)

The community evidence, in one paragraph each:

**Editor legibility is the #1 complaint.** A 2026 review of Payload scores the stock editing
interface 2/5 for non-technical editors ("no drag-and-drop page builder out of the box").
Payload's sanctioned lever for this is `admin.components.Label` per block (fixed to render
in payload#10686) plus `imageURL` thumbnails in the add-block drawer and `admin.group`
grouping (payload#11239). We use grouping and nothing else. A page with 12 blocks currently
shows 12 rows reading "Hero / Hero / Rich Text".

**We rebuilt a framework feature by hand.** Our collections carry bespoke filter pills;
Payload ships **Query Presets** (`enableQueryPresets`), which save and share filters,
columns and sort order per user, stored in `payload-query-presets` — WordPress's
"Screen Options" done properly. Stable since 3.78 (editable from the form view).

**Blocks are theme-bound by type.** `blockRegistry` is `Record<string, BlockComponent>` —
one component per slug. Theme packs add *new types* (`nexusHero`, `aetherHero`) rather than
overriding `hero`, and no shared block reads the active pack. Consequence: a page authored
on Nexus stores `nexusHero` and renders a Nexus hero inside Aether chrome after a theme
switch. That is the honest answer to "is the block system solid for every theme?" — the
data layer is solid, the rendering layer is not.

**Speed and safety are free wins.** Autosave, trash (out of beta in 3.78) and a version
diff are config or small components, and they remove the two most common ways an editor
loses work.

**Deliberately not doing:** dashboard widgets (Payload marks them *experimental*; our
`ModernAdminDashboard` already works and a migration would trade a working screen for an
API that may change), and a Gutenberg-style inline block preview (`admin.components.Block`
replaces the entire block UI including the collapsible — a large surface for a
still-unproven payoff).

---

## 2b. Review Focus — the five input classes most likely to bite a user

Each line is pinned to the task whose test must exercise it.

1. **A block with no summary field** (richText, section, columns) — the row label must show a
   stable fallback, never an empty row or "undefined". → Task 1.2 (`blockLabelText` fallback test).
2. **An unknown or unset theme pack** (fresh DB, `rig-dark`, a typo in the global) — must render
   the shared block, never a blank page or a crash. → Task 3.1 (unknown pack falls back to shared).
3. **A legacy theme slug** (`nexusHero` authored before this work) — must keep rendering its
   original component after the alias table lands. → Task 3.1 (alias resolution test) + 3.3 browser check.
4. **A preset that references a column or filter removed later** — must degrade to the default
   view rather than erroring the list. → Task 2.1 acceptance (save → reload → list still loads).
5. **Autosave while another user holds the document lock** — must not overwrite or error-loop.
   → Task 4.1 browser check (two sessions, edit in both).

---

## 3. Global constraints (apply to every task)

- Never commit or push unless the user asks. One conventional commit per logical change.
- TDD: write the failing test first, watch it fail for the right reason, then implement.
- Gates after every task: `pnpm test` + `pnpm -r typecheck` + `pnpm lint`; `pnpm workflow:check`
  before each phase is declared done.
- Read `.devin/context/04-cms-pages-theme.md` before touching blocks; `01-commerce.md`
  before touching shop collections; `02-builder.md` before pc-builder.
- No raw hex in `apps/web/src/**`; tokens only. No emoji in UI.
- Plugin boundary: no cross-plugin or plugin→`apps/web` imports.
- Schema changes: SQLite push happens only on a `pnpm dev` boot. Any task that adds a
  collection field must say so and be verified on a dev boot, not just in tests.
- Keep `apps/web/vitest.config.ts` and the `apps/web/AGENTS.md` Next-managed block untouched.

---

## 4. Decision log (the three contested choices)

**D1 — Block labels: custom component per block vs one shared component.**
Chosen: **one shared `BlockRowLabel` component**, parameterised per block by a small
`labelField` (which field to show as the summary). Rationale: 28 near-identical components
is how the admin got unreadable in the first place; one component + one config line per
block keeps the diff honest. Alternative rejected: per-block bespoke labels (28 files,
divergent formatting, harder to change later).

**D2 — Saved views: Payload Query Presets vs extending our filter pills.**
Chosen: **Query Presets on 3 collections**, keep the pills on the rest for now. Rationale:
presets are a framework feature with persistence and sharing we would otherwise rebuild;
the pills already work where presets do not apply (custom views). Alternative rejected:
rebuild pills everywhere (weeks, no sharing, no persistence).

**D3 — Theme-resolved blocks: override map vs per-block theme switch.**
Chosen: **an override map consulted by `renderBlocks`** — `resolveBlockComponent(slug, pack)`
checks `packOverrides[pack]?.[slug]` first, then the shared registry. Rationale: keeps the
authored slug stable (`hero`), so switching a theme re-renders rather than re-authors; one
function, one test surface. Alternative rejected: making every shared block read the pack
internally (scatters theme logic across 18 components, impossible to test as a unit).

---

## 5. Phase 1 — Editor legibility (P0)

**Ships:** every block row in the page editor reads as its content ("Hero — Build your
perfect rig"), the add-block drawer shows a thumbnail and a description per block.

**Why first:** smallest diff with the largest felt change; no schema migration.

### Task 1.1 — Probe the Label props contract ✅ DONE (2026-10-22)

**Observed** (probe component rendered the received keys on `/admin/collections/pages/1`):

```
field: object | indexPath: string | parentPath: string | parentSchemaPath: string | path: string | permissions: boolean
```

**There is no `data` prop.** A block row label receives form-context descriptors plus the
block config (`field`), not the row's values. Consequences, now baked into 1.2:

- The component must read values from form state with `useFormFields` keyed on `` `${path}.${labelField}` ``.
- `labelField` must travel on the block config (`field.admin.custom.blockLabelField`), not as a prop.
- The fallback should come from `field.labels.singular` so an empty block reads "Hero Banner", not "undefined".

**Status:** probe removed, `hero.ts` reverted.

### Task 1.2 — Shared `BlockRowLabel` component — BLOCKED by the platform

**Result: not implementable in Payload 3.90.2.** Four probes on `/admin/collections/pages/1`:

| Probe | Outcome |
|---|---|
| `Object.keys(props)` | `field, indexPath, parentPath, parentSchemaPath, path, permissions` — **no row data** |
| A bare Label ignoring `field` | renders, but **3x "Converting circular structure to JSON"** per page load (Payload serialises `field`, which carries the payload instance) |
| Rendering `path` / `indexPath` / `parentPath` | `layout` / **empty** / **empty** — identical for all 8 rows, so a label cannot tell rows apart |
| Same component reading form state by `${path}.blockType` | always falls back — the row path is unavailable |

Also: importing the label map from `@buildmyrig/plugin-pages` (package root) into a client
component pulled lexical + `payload` internals into the browser bundle and turned
`/admin/login` into a **500** until a subpath export was added — a second reason to keep block
admin work component-free.

**Decision: abandoned.** Same outcome delivered as data (Task 1.3 pivot below).

### Task 1.3 — Block rows named after their content — DONE (pivot, `7ffee4e`)

Payload renders `blockName` as the block row title, so the name is set as data:

- `apps/web/src/lib/block-name.ts` — `blockNameFor(block)` derives a name from the block's
  summary field (`heading`/`title`), `null` when it has none; 4 unit tests
- `apps/web/src/repair-block-names.ts` + `repair:block-names` — idempotent backfill
  (ran on the dev DB: **8 pages updated**)

**Verified in the browser:** `01 Hero Banner - Build your per...`, `02 Templates Carousel -
Ready-to-g...`, `03 Product Grid - Latest p...`, `05 Featured Category - Graphics cards for every...`,
**0 page errors**. 901 to 905 tests, tc + lint clean.

Payload truncates the chip to ~14 characters; widening it would mean styling Payload internals
again, so the row label + content prefix is the delivered scope.

### Task 1.4 — Drawer thumbnails + descriptions

**Files:** Modify the 28 block files (`admin.imageURL`, `admin.imageAltText`), add
`apps/web/public/admin/blocks/*.svg` (28 lightweight SVGs — grey wireframe, no brand colour).

- [ ] **Step 1:** Create the 28 SVGs (240×135, `currentColor` strokes, one per block shape).
- [ ] **Step 2:** Add `imageURL: '/admin/blocks/<slug>.svg'` + `imageAltText` to each block.
- [ ] **Step 3:** Browser check: the add-block drawer shows a thumbnail per block, grouped as today.
- [ ] **Step 4:** Commit `feat(admin): block picker thumbnails`.

**Acceptance:** every block in the drawer has a thumbnail; no block renders a broken image (verified in the browser, not by eye on the diff).

### Phase 1 gate

`pnpm test` (expect ≥ 906), `pnpm -r typecheck`, `pnpm lint`, `pnpm workflow:check`, plus a browser
pass on `/admin/collections/pages/1` and the drawer. **Review checkpoint with the user before Phase 2.**

**Rollback:** revert the phase commit; labels and thumbnails are additive config only.

---

## 6. Phase 2 — Saved views (P0, mostly config)

**Ships:** products, orders and compatibility-rules gain shareable saved views (filters + columns
+ sort), replacing the bespoke pills on those three screens.

### Task 2.1 — Enable presets on the three collections

**Files:** Modify `packages/plugin-shop/src/index.ts` (products), `packages/plugin-shop/src/collections/orders.ts`, `packages/plugin-pc-builder/src/collections/compatibility-rules.ts`.

**Interfaces:** `enableQueryPresets: true` on each `CollectionConfig`.

- [ ] **Step 1: Write the failing test** — a config test asserting each of the three collections has
  `enableQueryPresets === true` (same style as the existing access-matrix tests).
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add the flag to all three.
- [ ] **Step 4:** Run — PASS. Restart `pnpm dev` (new collection `payload-query-presets` → schema push).
- [ ] **Step 5:** Browser check: the list view shows the presets control; save a preset, reload, confirm it persists.
- [ ] **Step 6:** Commit `feat(admin): query presets on products, orders and rules`.

**Acceptance:** a saved preset survives a reload and is visible to a second user (share it, then re-read as manager).

### Task 2.2 - Starter presets - DONE (`2b3fbe7`)

`apps/web/src/seed-presets.ts` + `seed:presets`: "Low stock (under 5)" on products,
"Needs fulfilment" on orders. Idempotent by (relatedCollection, title) - the second run logs
"all presets already exist".

**Gotcha that cost a cycle:** a preset created through the local API defaults to
`access.read.constraint: onlyMe` with an empty user list. The doc exists but is readable by
nobody - the preset menu shows "No Results" and even an authenticated REST read returns
`totalDocs: 0`. The seeder sets `{ constraint: 'everyone' }` explicitly.

### Task 2.3 - Retire the bespoke pills - DROPPED (reconsidered)

The pills are one-click quick filters ("In Stock 38", "Low Stock 4", "Published"); presets are a
saved-views menu. Removing the pills would slow the common case to save a menu entry. **Both stay.**
If the duplication ever bites, collapse the pills into one "Quick filters" popover rather than
deleting them.

### Phase 2 gate

Same gate trio + `pnpm workflow:check` + browser pass on all three lists. **Review checkpoint.**

**Rollback:** remove `enableQueryPresets` (the presets collection stays but is unused) and restore the pills from git.

---

## 7. Phase 3 - Theme-resolved blocks - DONE (`3e000fd`)

**Ships:** a page authored with the shared `hero` block renders the active pack's hero.

| Task | Result |
|---|---|
| 3.1 `resolveBlockComponent(slug, pack)` | Done. Order: legacy pack slug -> pack override -> shared registry -> null. 6 unit tests. |
| 3.2 Thread through the renderer | Done. `renderBlocks(layout, { pack, source })` still accepts the old string shape; `PageRenderer` passes the pack from `getThemeAssets()` (request-cached). |
| 3.3 Migrate the packs | **Narrowed on purpose** - see below. |

**3.3 was narrowed after looking at the blocks.** Only `hero` is a genuine 1:1 across packs. The other nine
are distinct features (aether's product lab is not a variant of nexus's product rail, and their field sets
do not overlap), so forcing them into the override map would promise portability the schemas cannot support.
They stay as legacy aliases that render exactly what they rendered before.

**Verified live, same homepage content:**

| Theme global | Rendered hero |
|---|---|
| `nexus` | `nx-hero`, no `ae-hero` |
| `aether` | `ae-hero`, no `nx-hero` |
| restored `nexus` | `nx-hero` |

Legacy check: `/aether-showcase` (authored with `aetherHero`) still renders `ae-hero` while the pack is
`nexus` - existing pages are untouched. Tests 908 -> 915, tc + lint clean.

**Follow-up when a third pack lands:** add its `hero` override only. If a pack ever needs to change a
*non-hero* shared block, unify the field sets first, then add the override - otherwise the pack component
will render against fields the content never had.

## 8. Phase 4 - Speed & safety - DONE

| Task | Result |
|---|---|
| 4.1 Autosave on pages | Done. `versions.drafts.autosave.interval = 800`. Verified in the browser: one `PATCH /api/pages/8?autosave=true&draft=true`, the probe title survived a reload **without saving**, and the published doc was untouched. |
| 4.2 Trash on products + pages | Done. `trash: true` on both. Six browser checks passed: leaves the default list, sets `deletedAt`, **storefront 404s**, restore clears it, returns to the list, storefront serves 200 again. |
| 4.3 Version diff view | Deferred (unchanged). |
| 4.4 Quick Edit drawer | Deferred (unchanged). |

**Two decisions taken while implementing, both because the platform disagreed with the plan.**

1. **Autosave is on for pages only, not products.** `plugin-shop/src/index.ts` deliberately sets
   `autosave: false` on products with a comment blaming orphan draft rows on autosave. That diagnosis
   does not hold up: the admin's Autosave element only PATCHes when `collection && id` exists
   (`@payloadcms/ui/dist/elements/Autosave/index.js`), so the create view cannot autosave, and it also
   skips the first render (`didMount` guard). But I could not reproduce the original bug, so I left the
   documented decision alone rather than overturn it on a code reading. Products autosave stays off
   until someone reproduces the leak.

2. **Pages revalidation is now guarded.** Payload runs collection `afterChange` hooks on autosave saves
   with no autosave guard around the hook loop
   (`payload/dist/collections/operations/utilities/update.js`), so enabling autosave as-is would have
   revalidated `/` and `/<slug>` every ~800ms while an editor typed. `lib/page-revalidate.ts` now
   revalidates only when the save is or stops being publicly visible: published after the save, or
   published before it (unpublish). Draft-to-draft autosaves do not bust the cache. Four unit tests.

**Two defects found and fixed on the way**

- **Trashed products answered HTTP 200.** `product/[slug]/loading.tsx` put a Suspense boundary above the
  PDP, so `notFound()` streamed 200 + not-found markup — the same class of bug the audit fixed for CMS
  slugs (#667), which never covered product slugs because this file was left in place. Removed; the PDP
  now answers 404 for unknown, unpublished and trashed slugs. Cost: the PDP skeleton is gone (PDPs are
  ISR-cached, so it rarely rendered). Covered by a new `not-found.spec.ts` case.
- **The injected row action bypassed trash.** Payload's own delete button PATCHes `{ deletedAt }` on a
  trash-enabled collection; ours always sent `DELETE`. `lib/row-actions.ts` now decides between
  permanent delete, trash, and hidden (trash view, or no id), and `applyListCellElevation` passes the
  capability as a `clientProps.trash` because Payload strips `trash` from the client config.

**Known limitation, documented not fixed:** restoring through Payload's modal defaults to *restore as a
draft*. A product trashed while published comes back unpublished until someone ticks "Restore as
published version". That is Payload's safe default, not something this phase overrides.

---

## 9. Adversarial review (the `/critique` pass — what could sink this)

| # | Risk | How we would see it | Mitigation |
|---|---|---|---|
| 1 | **Label component props are not what we think** (`PayloadComponent<any, any>` is untyped) | Task 1.1 probe returns a shape without `data` | Probe is step 1 of the phase; 1.2's signature changes before code is written |
| 2 | **28 label registrations drift** — a new block ships without a label | The invariant test in 1.3 fails on the next block | Test is written first and lives in `definitions.test.ts` |
| 3 | **Query presets duplicate our pills** — two filter UIs on one screen | Browser pass in 2.3 | Pills removed in the same phase, not "later" |
| 4 | **Presets need a schema push we do not notice** | Browser shows no presets control after restart | Explicit step: restart `pnpm dev`, then re-check; noted in §3 |
| 5 | **Theme resolution silently changes live pages** | 3.2's browser check on `/` and `/aether-showcase` | Resolution is additive; alias table keeps old slugs working |
| 6 | **A pack override targets a slug that no longer exists** | 3.3's test asserts every override slug is registered | Test is the guard |
| 7 | **Autosave fights the theme-revalidate hook** (every autosave POST revalidates the layout) | Cache-busting storm in the dev log | **Real — mitigated in 4.1.** Payload does run `afterChange` on autosave; `lib/page-revalidate.ts` now skips draft-only saves. `themeRevalidatePlugin` only touches globals, so it was never the risk; the pages hook was |
| 8 | **Custom components slow the admin** (the known Payload perf trap: server action on every keystroke, payload#13753) | Slow edits after 1.3/4.4 | Labels are render-only (no fetch, no hooks); Quick Edit drawer is one fetch on open, none per keystroke |

**Two things this plan deliberately does not claim:** that the admin will "feel modern" (that is a
judgement, not a gate), and that any of it improves accessibility — the browser gates that would
prove that (`verify_states`, `axe_audit`) cannot run in this environment.

---

## 10. Sources

- Payload Blocks field (admin options, `initCollapsed`, `isSortable`): payloadcms.com/docs/fields/blocks
- Block groups (`admin.group`, #11239) and `imageURL` thumbnails: github.com/payloadcms/payload/discussions/12149
- Custom block row labels fixed (#10686): github.com/payloadcms/payload/commit/6c19579
- Query Presets: payloadcms.com/docs/query-presets/overview · release notes v3.78.0
- Dashboard widgets (experimental) and widget fields: payloadcms.com/docs/custom-components/dashboard
- Custom views / performance caveat: payloadcms.com/docs/v3/custom-components/overview
- Admin form server-action-per-keystroke: github.com/payloadcms/payload/issues/13753
- Release-stability feedback: github.com/payloadcms/payload/discussions/14056
- WordPress admin patterns (Screen Options, Quick Edit, bulk edit, revisions): wordpress.org/documentation/article/administration-screens, make.wordpress.org/core/2023/07/05/revisions
- 2026 Payload review (editing UX 2/5 for non-technical editors, v4 drops Sass): idealabz.ae/blog/payload-cms-review

---

## 11. Decisions taken (2026-10-22)

1. **Thumbnails: deferred.** Ship labels first (1.1–1.3); revisit 1.4 after the labels have been
   used. Phase 1 as executed = 3 tasks, not 4.
2. **Phase 2 scope: all three collections** (products, orders, compatibility-rules).
3. **Phase 3 before the next theme pack** — otherwise every new pack adds block types again.
4. **Phase 4: autosave + trash only.** Version diff and the quick-edit drawer stay deferred until
   there is a reason to spend on them.

## 12. Open questions (answered above, kept for the record)

1. ~~Thumbnails~~ — deferred.
2. ~~Phase 2 scope~~ — all three.
3. ~~Phase 3 timing~~ — before the next pack.
4. ~~Phase 4~~ — autosave + trash.


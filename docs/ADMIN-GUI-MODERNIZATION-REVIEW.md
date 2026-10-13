# Admin GUI Modernization — Change Review Handoff

Snapshot of the full modernization program for external review. Source of
truth: `docs/buildmyrig-plan/18-progress-log.md` (entries 102–112).
Last updated: 2026-10-11, after the mockup source correction.

## ⚠ Authoritative mockup — corrected source

**The repo's `AdminGUI/` folder is an unrelated AI Studio export** (HR/payroll:
`PayrollPages`, `LeaveRequestsPage`, `WagesPage`, `TeamsPage`). It was never the
BuildMyRig reference. The authoritative mockup is external:

```
C:\Users\EDEMNUSHIW\Downloads\buildmyrig-studio-admin---modern-cms-&-pc-engine-console
├── AdminGUI\Design.md          ← real spec (Tailwind/Motion prototype)
└── src\components\
    ├── admin\   ModernAdminNav, TopHeader, CommandPalette, ApiPayloadModal,
    │            StorefrontPreviewModal, VersionsModal
    └── pages\   ProductsListView, ProductEditView, CategoriesView, BrandsView,
                 ProductAttributesView, ShippingBandsView, RuleMatrixView,
                 DesignSystemView
```

Serve it with its own Vite toolchain (quote the path — it contains `&`;
`npx` parses it as a command separator — invoke `node …\node_modules\vite\bin\vite.js`).
Runs on :3030; title "BuildMyRig Studio Admin - Modern CMS & PC Engine Console".

The repo's `AdminGUI/Design.md` was rewritten for BuildMyRig during the program
and its 7-row gap audit drove the work below — it is a **superset** of the real
spec (it mandates 4-card ribbons / facet pills / alert banners on every view;
the real mockup does not have these on plain list views).

## Real-mockup vs production — side-by-side findings (2026-10-11)

Screenshots captured from both: `mockup-real-*.png` (mockup :3030) and
`.playwright-mcp/bmr-admin-*.png` (production :3000).

| Dimension | Real mockup | Production now | Delta |
|---|---|---|---|
| List header | Title + count chip + subtitle + one primary CTA; search input + `All Categories`/`All Statuses` dropdowns | Badge + title + subtitle + 4-card KPI ribbon + AlertBanner + facet pill rail + quick actions + CTA | **Heavier than mock** — ribbons/pills/banners are repo-spec additions, not in mock |
| Table cells | `ID` · `ITEM TITLE & SKU` (bold + `SKU:` mono subline) · `CATEGORY & BRAND` (two-line stacked) · `PRICE / MARGIN` (price + green `↗ 25.1% margin`) · `STOCK` `N in stock` · `STATUS` pill · `ACTIONS` (pencil + trash) | **Done (entry 114)** — `IdCell`, entity cell (title+SKU/slug subline), `TaxonomyStackCell` (category + brand two-line), `PriceListCell` margin subline, `StockCell`, `StatusPillCell`, `RowActionsCell` | Aligned; margin subline renders only when `costInEUR` is set (null in seed) |
| Row actions | Pencil `Edit` + trash icon per row | **Done (entry 114)** — `_bmrActions` ui-field column with pencil link + trash (REST DELETE + refresh) on products + 10 registry collections | Resolved via ui-field cell trick (no Payload row-action slot needed) |
| Rule Matrix | LIVE COMPATIBILITY ENGINE SANDBOX panel (CPU/mobo selects + GPU-length & PSU sliders + evaluated pipeline diagnostics) above an Active Rules Registry (severity pill + domain chip + `Enforced` check + `Evaluated: N · Last triggered`) | **Done (entry 114)** — `RuleSandbox`: 5 selects from real `/api/builder/index`, evaluated by `createRuleEngine` (`@buildmyrig/lib`) — socket/clearance/PSU diagnostics + `validateSelections` verdicts; registry below | Aligned; sliders→selects (real component data, equivalent control surface) |
| Nav | Groups: `STORE & COMMERCE` (Orders/Products/Categories/Brands/Shipping Bands/Product Attributes), `PC BUILDER ENGINE` (Components/Configured Builds/Build Templates/Component Slots/Compatibility Rules/Rule Matrix `LIVE`/Builder Analytics `STATS`), `UI Standards & Form Spec`; per-item counts; user card + `Storefront`/`Sign Out` at bottom | Groups: `STORE & CATALOG`, `ORDERS & CUSTOMERS`, `PC BUILDER`, `SITE CONTENT`, `GLOBALS`, `PLUGINS`; per-item counts; skin selector + palette footer | Superset (globals/pages/menus exist in prod, not in mock); group labels differ; mock puts **skin picker top-right in header**, user card bottom-left |
| Top header | Breadcrumbs · skin picker · `Storefront ↗` · avatar | Payload-native header + `AdminHeaderActions` — **skin picker is top-right** (`Admin GUI Theme` select verified live), `Storefront` external link, avatar | Aligned |
| Product edit | Doc header w/ `Versions` `API` `Preview` `Save Draft` `Publish changes`; 5 tabs: General & Media / Pricing & Margin / Inventory & Logistics / Hardware Specs / Builder Rules; right taxonomy sidebar (category/brand quick-`+`, badge ribbon, warranty, SERP preview) | **Done (entries 114–115)** — exactly the mock's 5 tabs; `Builder Rules` hosts the linked-component telemetry + merged `isComponent`/`component` linkage fields; taxonomy sidebar has native `allowCreate` `+`; `SerpPreviewField` SERP card (live `#field-*` values) | Aligned; SERP preview reads DOM (sidebar ui fields lack form/doc context) |
| Design axioms | 6 principles: zero-pill metadata, 60-30-10 color, single-elevation, spatial math, tabular-nums, <150ms | Same axioms implemented (token-only CSS, tabular-nums, hairline borders) | **Aligned** — visual language carries over |

**Verdict (updated after entry 114):** the mock's feature deltas are now
implemented — row actions, stacked taxonomy cells, margin subline, live rule
sandbox, top-right skin picker, Builder Rules tab, SERP preview. The remaining
divergence is *composition*: production list views intentionally carry
repo-spec chrome (KPI ribbons, alert banners, facet pills) that the mock omits
on plain list views — kept as a deliberate richer-telemetry decision.

**Implementation notes for reviewers:**

- Virtual columns: Payload 3 has no row-action/id/status slot, so
  `applyListCellElevation` injects `ui` fields (`_bmrId`, `_bmrStatus`,
  `_bmrActions`) whose cells read values from `rowData`, plus a
  `defaultColumns` override on products.
- List queries run `depth:0`; `TaxonomyStackCell` resolves relationship ids
  via a module-level promise cache (`fetchDoc` — deduped per `slug:id`,
  one request per unique value).
- `RuleSandbox.evaluateSandbox` is pure (exported for tests) — runs
  `createRuleEngine(index)` + `recommendedPsuWatts` client-side; the real
  diagnostics, not a cosmetic mock.
- `ui` fields render with **no** `FormFieldsContext`/`DocumentInfoContext`
  anywhere (sidebar AND tabs — `useFormFields`/`useDocumentInfo` → `{}`;
  `useField`/`useForm` throw in the RSC pass). `SerpPreviewField` reads
  `#field-*` inputs via `useSyncExternalStore` + MutationObserver;
  `BuilderRulesTabField` derives the doc id from `usePathname()`
  (`/admin/collections/<slug>/<id>` — `useDocumentInfo().id` is never set).
- `withBuilderTab` (pc-builder) merges its `isComponent`/`component` linkage
  fields into the shop plugin's `Builder Rules` tab when present — one tab,
  matching the mock's five (idempotent; falls back to a `Builder` tab).
- Plugin wiring: `shopPlugin({builderRulesTabComponent, serpPreviewComponent})`
  in `payload.config.ts`; both ui fields degrade gracefully when options
  are unset.

## Target end-state (Design.md §3 audit — all rows now covered)

| # | Gap | Status | Where |
|---|-----|--------|-------|
| 1 | Persistent sidebar + grouped rails + skin picker | Done | `ModernAdminNav.tsx` |
| 2 | Breadcrumbs + status dot + action bar | Done | `AdminHeaderActions.tsx`, nav crumbs |
| 3 | 4-card KPI telemetry ribbon on every view | Done | all headers + dashboard |
| 4 | Quick-filter facet pill rails | Done | `FilterPills` in every list header |
| 5 | Entity cells / mono chips / currency / action strip | Done* | `EntityListCell`, `CodeChipCell`, `PriceListCell` |
| 6 | Operational alert banners | Done | `AlertBanner` on all views |
| 7 | 3-column plugins manager w/ ping badges | Done | `PluginsManagerView` at `/admin/plugins` |

\* Action strip deferred: Payload 3 list rows expose no row-action injection
point; `TableActionStrip` primitive exists in `admin/ui/TableCompound.tsx`.

## Architecture decisions

- **Globals** elevated via `admin.components.elements.Description` — Payload
  renders it as `DocumentHeader.AfterHeader` (below title/save bar). Verified
  in `@payloadcms/next` source. Rejected: `ui` field (inside form column),
  `views.edit` override (replaces native form/save).
- **Collections** elevated via `admin.components.beforeList` — bespoke
  headers for the 7 primary listings, registry-driven header for the rest.
- **Cells** via `field.admin.components.Cell` specifiers applied by a
  config-time transform (`listCellElevationPlugin`, last plugin in
  `payload.config.ts` so it sees plugin-registered collections).
- **Styling** is token-only (`var(--theme-*)`, lint-enforced no-hex), plain
  CSS in `admin.css` + `admin/ui/ui.css`. Four skins: `precision-dark`,
  `light-clean`, `cyber-neon`, `classic-payload` via `data-admin-theme` on
  `<html>`, persisted in `localStorage.bmr_admin_theme`.
- **Telemetry** = client-side `fetch('/api/...')` in `useEffect`, `isMounted`
  guards, `.catch → null` fallbacks, `limit=0` for counts, capped
  `limit=100` doc fetches for derived metrics.
- **Facet pills** navigate `?where[field][op]=value` via `router.push`.

## Files added (entries 110–112 + earlier program)

### Global edit-view headers (mount: `elements.Description`)
- `admin/components/SiteSettingsHeader.tsx` — `Global Settings` badge, header/footer/announcement/admin-skin KPIs
- `admin/components/BuilderSettingsHeader.tsx` — `Builder Engine` badge, renderer/slots/rules KPIs (3 REST sources)
- `admin/components/ThemeHeader.tsx` — `Theme Engine` badge, preset/overrides/chrome-pack KPIs (`countThemeOverrides` counts non-empty strings only)
- `admin/components/MegaMenuHeader.tsx` — `Storefront Chrome` badge, sections/items/promos/status KPIs (`megaMenuStatsFromDoc` mirrors `resolveMegaMenu` sanitation — title-less sections dropped, promos need title+URL)

### Collection list headers (mount: `beforeList`)
- Bespoke: `UsersListHeader`, `ProductsListHeader`, `ComponentsListHeader`, `OrdersListHeader`, `TemplatesListHeader`, `ConfiguredBuildsListHeader`, `ComponentCategoriesListHeader`
- **`RegistryListHeader.tsx`** — one component, `LIST_HEADER_REGISTRY` keyed by slug; covers `categories`, `brands`, `discount-codes`, `reviews`, `shipping-bands`, `tax-rates`, `attribute-types`, `media`, `inventory-reservations`, `pages`, `variants`, `transactions`. Add a collection = registry entry + slug, no new file.

### List-table cells (mount: `admin.components.Cell`)
- `EntityListCell.tsx` — 32px monogram/thumbnail + bold title + mono subtitle (`sku→slug→socket→shareId→orderNumber→#id`); mirrors `DefaultCell` link contract: `link:true` alone → `/admin/collections/<slug>/<id>` (Payload only sets `linkURL` with `formatDocURL`), `viewType==='trash'` aware, `onClick` wins (drawer select mode)
- `CodeChipCell.tsx` — mono chip (`sku`, `slug`, `socket`, `code`), `—` empty
- `PriceListCell.tsx` — cents → `formatEUR`, `tabular-nums`
- **`apps/web/src/lib/admin-list-cells.ts`** — `LIST_CELL_MAP` (11 collections) + `LIST_HEADER_SLUGS` (12); recursive field walker (tabs/groups/blocks); preserves existing `admin.components`; `listCellElevationPlugin()`

### Shell / views (earlier entries)
- `ModernAdminNav.tsx` (persistent grouped sidebar), `CommandPalette.tsx` (⌘K), `ModernAdminDashboard.tsx`, `PluginsManagerView.tsx` (`/admin/plugins`), `RuleManagerView.tsx` (`/admin/compatibility-rules-manager`), `BuildStatsView.tsx` (`/admin/build-stats`), `AdminThemeSync.tsx`, `AdminHeaderActions.tsx`
- `admin/ui/` primitives: `MetricCard`, `FilterPills`, `AlertBanner` (`action.external` added), `Button`, `TableCompound` (entity cell/code chip/status badge/action strip), `Card`, etc.

### Plugin wiring
- `plugin-pages`: `siteSettingsHeaderComponent`, `themeHeaderComponent`, `megaMenuHeaderComponent` → `withDescription` helper merges `elements.Description`
- `plugin-pc-builder`: `builderSettingsHeaderComponent` + 4 `*ListHeaderComponent` options
- `plugin-shop`: `productsListHeaderComponent`, `ordersListHeaderComponent`
- `payload.config.ts` passes all specifiers; `importMap.js` regenerated via `pnpm payload generate:importmap`

## Bugs found & fixed during review rounds

1. **`AdminThemeSync` GET-clobber** — fetch interceptor applied `adminTheme`
   on *any* site-settings response incl. the header's telemetry GET, wiping
   the user's skin choice. Now write-only (`adminThemeFromSaveResponse`).
2. **Same-tab storefront links** — quick actions abandoned unsaved edits;
   now `_blank` + `noopener noreferrer` everywhere incl. `AlertBanner.action`.
3. **`useConfig()` in cells** — `undefined` during Payload's server-side
   `renderListView` pass → 500 on the whole list. Cells must not call it;
   admin route built directly.
4. **Cell link contract** — `linkURL` is `undefined` unless `formatDocURL`
   configured; `link:true` alone means "build default edit URL". First cut
   dropped row navigation entirely; caught by live DOM check, pinned by test.
5. **E2E drift** — `admin-crawl` listed `attribute-values` (admin.hidden →
   404 by design); `withClassicChrome` needed always-POST + double warm-hit
   (ISR stale-while-revalidate served `nexus` markup to classic assertions).
6. **Crawl coverage** — added `discount-codes`, `reviews`, `shipping-bands`,
   `tax-rates`, `inventory-reservations`, `variants`, `/admin/plugins`.
7. **Variants edit view 500 (upstream)** — `VariantOptionsSelector` called
   `findByID(data.product)` unconditionally; autosave-created orphan drafts
   (`product:null`) threw `NotFound` → whole view 500. Fixed via a new hunk
   in `patches/@payloadcms__plugin-ecommerce@3.90.2.patch` (pin #236).
   NB: cookie auth needs `Origin`/`Sec-Fetch-Site` or it's silently anonymous
   — curl probes masked this crash.
8. **`/api/reviews` shadowed (405)** — `(frontend)/api/reviews/route.ts`
   exported only POST → all collection REST verbs unreachable (admin list
   pagination included). Route now delegates GET/PATCH/PUT/DELETE/OPTIONS to
   `REST_*(config)` w/ synthetic slug params; authenticated POSTs → REST
   create; anonymous POSTs keep the rate-limited public pipeline.
9. **`_status` on non-versioned collection** — `brands` registry queries
   400'd ("path cannot be queried"); replaced with `logo`/`url` existence
   metrics; pin #601 forbids `_status` outside versioned slugs.

## Test coverage

- Cumulative unit tests **#1–#605**; web suite 390, all packages green.
- New this program: header component tests (defaults/props/malformed
  telemetry/scope chrome), plugin wiring tests, cell render + transform
  tests, registry integrity (every entry → exactly 4 metrics, null-safe),
  `adminThemeFromSaveResponse` regression, patch pin #236, reviews REST
  delegation + auth split, `_status`-on-versioned-only pin.
- E2E: **22/22 on production build** (`pnpm build` → `pnpm start` →
  `pnpm test:e2e`) incl. the extended 59-route admin crawl; dev-mode e2e
  is flaky (cold Turbopack compiles).

## Gate commands

```
pnpm test            # unit (all workspaces)
pnpm -r typecheck    # tsc across 6 packages
pnpm lint            # eslint, 0 warnings allowed
pnpm build           # needs PAYLOAD_SECRET + DATABASE_URI exported
pnpm test:e2e        # playwright (prod server; reuseExistingServer :3000)
pnpm workflow:check  # AGENTS.md ≤10k chars + pointer/context budgets
```

## Known gaps / deferred

- `TableActionStrip` — no row-action slot in Payload 3 lists.
- Cell thumbnails render only when relations arrive populated; list selects
  displayed columns → monogram fallback is the norm in the table.
- Draft rows (ids 41–47) have no titles → "Untitled" + `#id` is correct.
- `/admin/collections/variants/create` autosaves an orphan draft variant per
  visit (upstream behavior) — they now render with a "link a product" hint
  instead of crashing; periodic cleanup of null-product drafts is optional.
- Dev server quirks: killing `next dev` can corrupt `.next` — delete
  `apps/web/.next` if typecheck fails spuriously; stale port-3000 servers
  shadow admin routes.

# 18 · Progress Log

Reverse-chronological work log. Each entry: what landed, verification, known gaps.

## 2026-09-28 (4) — Phase 2c: admin rule manager + conflict field + builder endpoints

- `packages/plugin-pc-builder/src/lib/builder-index.ts`: DB → `BuilderIndex` bridge (specs from typed component fields, rule value parsing for in/contains/gte/lte, enabled-filter, derived power config, `rulesVersion` from rule count + max updatedAt) and `getEngine()` for server-side evaluation.
- Endpoints: `GET /api/builder/index` (public), `GET /api/builder/rules/conflicts?componentId=` (interpolated messages, component names resolved), `POST /api/builder/rules/import` (staff-only, zod-validated rows, name/slug resolution).
- Admin: custom view `/admin/compatibility-rules-manager` (grid with inline enable toggle, delete, filter, CSV export, CSV import) via `admin.components.views`; "Live conflicts" ui field on Component edit view.
- **Critical admin fix**: `[[...segments]]/layout.tsx` was a bare passthrough since Phase 0 — replaced with the proper `RootLayout` + `handleServerFunctions` wiring; all admin pages previously 500ed (masked by the 307 redirect). Import map: custom admin components must be **string specifiers** resolved relative to the config's `importMap.baseDir` (apps/web/src) → `'../../../packages/plugin-pc-builder/src/admin/...'`; ran `payload generate:importmap`; page.tsx now imports the generated map (`../importMap`), the stale empty stub in `[[...segments]]` is unused.
- Verified: typecheck 5/5, rule engine 28/28, production build clean, smoke: `/admin/login` 200, `/admin/compatibility-rules-manager` 200 (rule table SSR-visible), component edit 200 with conflicts field; import endpoint 401 unauth / creates rows authed; conflicts for 7800X3D correctly names both LGA1700 boards.

## 2026-09-28 (3) — Phase 2b: builder collections + seed (31 components / 42 rules)

- `packages/plugin-pc-builder/src/collections/`: 6 collections per [04-collections/builder-collections.md](04-collections/builder-collections.md) + [compatibility.md](compatibility.md) — `component-categories` (slot types, required/maxSelectable), `components` (rel → `variants` per A1, typed rule-critical spec fields, cosmetic specsJson), `compatibility-rules` (subject/target component|category conditional fields, 5 operators, severity, bidirectional flag, message tokens), `derived-power-rules` (multiplier 1.3 + base 100), `build-templates` (drafts on), `configured-builds` (owner-scoped access, shareId, price/validation snapshots).
- Plugin wired: `pcBuilderPlugin` now spreads all 6 collections. Regenerated `apps/web/src/payload-types.ts` (strict `CollectionSlug` union requires the new slugs). Fixed `product-variants` → `variants` (actual ecommerce plugin slug).
- Seed extended: 34 products (+ variants), **31 builder components** across 9 slots (cpu…os), **42 compatibility rules** (socket/ramType/form-factor/GPU-length/PSU-headroom/cooler-socket/ITX-exclusions/NVMe/PCIe advisories), 1 derived power rule, **2 build templates** (Vanguard Gaming PC €1,862.00; Compact Creator ITX €1,472.00, both with 8 slots + computed basePrice).
- Verified: typecheck 5/5, rule-engine 28/28, production build clean, REST smoke: `/api/components`, `/api/compatibility-rules`, `/api/build-templates` (depth=1, slots resolve) all 200.

## 2026-09-28 (2) — Phase 2a: rule engine implemented + 28/28 tests green

- `packages/lib/src/rule-engine.ts`: full engine per [06-rule-engine.md](06-rule-engine.md) — bidirectional mirroring (category-normalized), component-specific targets respected, precomputed violation sets (O(components) evaluate), all 5 operators, conservative missing-spec semantics (A8), token interpolation with passthrough, power formula, `explainIncompatibility`, `conflictsFor`, stale-selection tolerance.
- Semantics locked during TDD: warns-type warnings surface on ALL candidates in the target category (card badges), warning/info-severity blocking rules warn only on live selected combos; out-of-stock components are skipped from `valid` (not "excluded") unless `inStockOnly: false`.
- Vitest wired into `packages/lib`; turbo `test` task runs it. Scale benchmark: 5k components / 2k rules evaluates < 20ms.
- Verified: 28/28 tests, typecheck 5/5, production build clean.

## 2026-09-28 (1) — Phase 1c storefront + review fixes

- Storefront routes live: `/` (ISR 60s), `/shop/[categorySlug]` (faceted filters: brand, price bands, sort, pagination via URL params), `/product/[slug]` (metadata API, spec table, Add to cart), `/cart`, `/checkout` (graceful no-Stripe state), `/admin` (Payload).
- Wired Stripe payments: server `stripeAdapter` (inactive unless `STRIPE_SECRET_KEY` set) + client `stripeAdapterClient` in `EcommerceProvider`. Endpoints: `/api/payments/stripe/initiate|confirm-order|webhooks`.
- Review fixes: category-page 500 (object-spread-into-array bug → `productFilters` now returns `Where[]`), price field shape (plugin stores top-level `priceInEUR`/`priceInEUREnabled`, not nested under `prices` — seed + formatter + filter paths corrected), re-seeded DB.
- Verified: typecheck 5/5, production build clean, curl smoke test — home/category/filtered/product/cart all 200 with correct content and prices; admin 307→login.

## 2026-09-27 — Phase 0 + Phase 1a (shop core) landed

- Phase 0 commits `e9059f8`, `8ca0d06`, `80c730d`, `11a93eb`: monorepo, DB adapter switch, plugin skeletons, CI, ecommerce spike (Path A adopted).
- Phase 1 commit `12d9605`: `plugin-shop` on `@payloadcms/plugin-ecommerce` 3.90.2 (EUR single-currency), catalog collections, products override (title/slug/category/brand/gallery/attributes/specs), roles on Users, seed (20 products + variants).

## Current phase status (vs [15-delivery-phases.md](15-delivery-phases.md))

| Phase | Status |
| --- | --- |
| 0 Foundations + spike | ✅ done |
| 1 Shop core — catalog, products, seed | ✅ done |
| 1 Shop core — payments/Stripe wiring | ✅ done (needs real Stripe test keys for live e2e) |
| 1 Shop core — e2e happy path (Playwright) | ⏳ pending — needs Stripe test keys for checkout leg |
| 2 PC builder — rule engine TDD | ✅ engine + 28/28 tests done |
| 2 PC builder — collections + seed (31 comps / 42 rules) | ✅ done (`5284cbc`) |
| 2 PC builder — admin rule manager + conflict field | ✅ done (incl. admin RootLayout fix) |
| 2 PC builder — configurator UI | ⏭️ next after rule manager |
| 3 Blocks + animations · 4 Hardening | not started |

## Known gaps / watch items

- Playwright e2e and checkout DoD blocked on Stripe test keys in `.env` (owner action).
- Dev DB is SQLite fallback (Docker absent on this machine); Postgres parity verified only in CI plan.
- Product spec table reads `specsJson`; per-category facet sidebar is hardcoded brand/price for now — attribute-driven facets land with builder work.

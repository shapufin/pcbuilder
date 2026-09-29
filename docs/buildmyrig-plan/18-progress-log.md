# 18 · Progress Log

Reverse-chronological work log. Each entry: what landed, verification, known gaps.

## 2026-09-29 (14) — Phase-4 admin-GUI deltas + access-matrix tightening + footer/legal + cache/`rulesVersion` + analytics (TDD #59–76) + live matrix verification

**Repo tracking**: everything through entry 13 pushed to GitHub (`github.com/shapufin/pcbuilder`, branch `main`, commit `ce6f133`, 124 files / +12690). Entry-14 work below is in the working tree, gated, and pushed as a follow-up commit.

**Access-matrix tightening (TDD #59–63)** — the entry-10 audit's deferred row, implemented per [11-access-security.md](11-access-security.md) rows 11/13/14/21/22:

- New role helpers `isStaff`/`isManager` in `packages/plugin-pc-builder/src/lib/access.ts` + `packages/plugin-shop/src/lib/access.ts`.
- 11 collections tightened: **compatibility-rules + derived-power-rules** read staff+/write manager+ (were public-read); **components, component-categories, build-templates** write manager+ (were any-authenticated-user); **categories, brands, attribute-types, attribute-values** write manager+ (shop content: public read, staff never wrote them); **prices + discount-codes** read staff+/write manager+ (raw REST now hides pricing/promo internals from the public; the storefront consumes them server-side through the ecommerce plugin's own paths).
- Tests: `access-matrix.test.ts` in both plugins — public read kept where the storefront needs it (catalog content), staff read-only everywhere, manager+ write, admin pass-through.
- Live verified on the prod build: unauth `GET /api/{compatibility-rules,prices,discount-codes}` → **403**, unauth `GET /api/components` → **200** (public catalog), staff `GET compatibility-rules` → 200 but staff `PATCH` → **403**, admin `PATCH` → **200** (manager+ write intact).

**Footer + legal links**: new `apps/web/src/components/SiteFooter.tsx` (About/FAQ/Contact/Terms/Privacy + copyright), mounted in `layout.tsx` inside `EcommerceShell`. The legal pages themselves were already seeded (`/terms`, `/privacy`, `/faq`, `/about`, `/contact`) — now discoverable. Live: homepage contains the footer nav; all five targets **200**.

**Builder-index cache + `rulesVersion` (TDD #64–66)** — the other entry-10 deferral:

- `lib/builder-index.ts` now exposes `getBuilderIndex` (30 s TTL + in-flight request dedup) and `invalidateBuilderIndex`; call sites in `endpoints.ts`, `builds.ts`, `configured-builds.ts` switched off the raw fetcher.
- `rulesVersion` extended from rules-only to a composite of rules + components + categories + power-rule counts/max-timestamps, so any of those touching bumps the version (client `useEffect` polling diffs it).
- Invalidation hooks: `compatibility-rules`/`derived-power-rules` `afterChange`, `component-categories` `afterChange`+`afterDelete`, appended to `components`' existing hook arrays.

**Rule-manager deltas (entry-10's "inline edit/export/CSV preview-diff")**:

- New pure helper `lib/rule-import.ts` (`ruleKey`, `diffImportRows`: create / skip-identical / error-with-reason, dedup within one file) + tests **#67–69**.
- Import endpoint (`POST /api/builder/rules/import`) now accepts `dryRun` → `{preview, entries, summary, errors}`; commit honors skips → `{created, skipped, errors}` (previously it re-created identical rows).
- `RuleManagerView.tsx` rewritten (610 lines): row-level inline edit (DraftRow with subject/target selects populated from `/api/components` + `/api/component-categories`), Add-rule draft row, Duplicate, Delete, filter, CSV export, and an import preview panel with per-row actions + Confirm/Cancel before commit.
- **Live bug found by e2e of the round-trip and fixed (TDD #74–76, new `src/endpoints.test.ts`)**: CSV export writes category **names** (`toCsvRow`), but `resolveName` looked categories up by **slug only** → every export→import of a category rule failed "not found". Fix: category subject/target resolve by `slug` **or** `name` (`where: {or: [...]}`); endpoint tests drive the real handler with a mocked payload that evaluates the actual `where` clauses (name input, slug input, name/slug dedup-to-skip, component names, commit-only-creates + error reporting, manager+ gate). Live re-verified: name-based dryRun now returns `create` entries, fake subject → `error`.

**Build Stats view (TDD #70–71)** — the plan's `components.views` deliverable (`05-plugin-contracts.md`): `lib/build-stats.ts` (`computeBuildStats` pure + `getBuildStats` 5-min TTL + `invalidateBuildStats`) → revenue (processing+completed only), order count/status breakdown, build statuses, top templates by `popularity`, low-stock products (1–5); endpoint `GET /api/builder/stats` (staff+); `BuildStatsView` + `BuildStatsNavLink` registered as `views.buildStats` (`/admin/build-stats`) + `afterNavLinks`. Live: admin/staff → 200 with seeded data, unauth → 401.

**Analytics events (TDD #72–73)**: `apps/web/src/lib/analytics.ts` `track(name, props)` — no-op unless `window.plausible` exists *and* `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set (test scaffolding fix along the way: the mock must hang `plausible` off the `window` object itself, not `globalThis`). Plausible `<Script>` added to `layout.tsx` only when the domain is configured. Events wired: `Add to Cart` (AddToCartButton), `Add Build to Cart` (SummaryClient), `Initiate Checkout` + `Purchase` (checkout). No-op by default — owner sets the domain env to activate.

`pnpm payload generate:importmap` re-run for the two new admin components (with dev server stopped — push race gotcha).

**Gate suite (all green)**: **141/141 tests** (lib 65, plugin-shop 22, plugin-pc-builder 48, web 6), `pnpm -r typecheck` 0, `pnpm lint` 0 problems, production build clean. Live smoke on `next start`: footer + 5 legal pages 200, admin routes (`/admin/compatibility-rules-manager`, `/admin/build-stats`) 200, matrix checks above, `GET /api/builder/index` returns the new composite `rulesVersion`, import dryRun create/skip/error paths, `GET /api/builder/stats` 401/200 as designed.

Still owner/machine-blocked: Stripe **live** e2e (keys), Playwright/Lighthouse (no browser), Sentry DSN, Postgres migration dry-run (no Docker), Upstash Redis. Cart-drawer/dialog animations from the Phase-3 note remain deferred with their components.

## 2026-09-28 (13) — Entry-12 review + lint gate repair + Stripe webhook handlers (TDD + e2e) + load test

**Review of entry 12 (`code-review-checklist` skill)** — verdict **SHIP after five fixes**:

1. **CRITICAL — the CI lint gate was dead**: entry 12 made `pnpm lint` blocking, but `apps/web`'s script was `next lint`, which Next 16 **removed** — the gate would fail (or skip the web app) for the wrong reason. Fix: real ESLint flat config — devDeps `eslint@^9.39` + `typescript-eslint@^8.46` + `eslint-config-next@16.3.6`, new `apps/web/eslint.config.mjs` (flat, core-web-vitals + tseslint, ignores `payload-types`/`importMap`/`.next`), script `eslint .`. Result: **0 problems**.
2. **`LandingClient.tsx`** exported a plain closure named `useTemplate` (rules-of-hooks false positive waiting to happen) → renamed `applyLandingTemplate` (3 call sites).
3. **`cart/page.tsx`** derived state in `setEffect` (set-state-in-effect) → `items`/`subtotal` computed directly from `cart` (2 `useState` + 1 effect removed).
4. **Hydration gates** in `Configurator.tsx`/`SummaryClient.tsx` (`useState(false)` + effect flip) → `useSyncExternalStore(() => () => {}, () => true, () => false)`.
5. Unused code: `CATEGORY_TO_SLOT` (seed.ts), `FakeUser` (Users.test.ts) removed.

**CRITICAL gap found in the payment path — Stripe webhook had zero handlers.** `stripeAdapter` was configured without the `webhooks` option: the adapter's endpoint would signature-verify and ACK `200 {received:true}` while **never updating orders/transactions/inventory**. Fix (TDD, tests **#53–#58**):

- New `packages/plugin-shop/src/payments/stripe-webhooks.ts`, wired via `webhooks:` in the `stripeAdapter(...)` call (plugin-shop `src/index.ts`):
  - `payment_intent.succeeded` — mirrors plugin-ecommerce's private `finalizeTransactionOrder`: find txn by `stripe.paymentIntentID` → CAS-claim `pending→processing` with `order exists:false` → create order from metadata snapshot (`cartItemsSnapshot`/`shippingAddress`/amount/currency) → cart `purchasedAt` → inventory `$inc` → settle `succeeded` + `order`. Replays hit `status==='succeeded'` / lost-claim guards and no-op (log + skip, never re-drive — re-driving could double-create an order).
  - `payment_intent.payment_failed` — CAS `pending→failed` only; settled/replayed events no-op.
  - `charge.refunded` — full refund only (`amount_refunded === amount`): txn `succeeded→refunded` (CAS) + order `processing|completed→refunded`; partial refunds logged for manual handling.
- Idempotency deviation from plan: state-machine CAS guards instead of an event-id store (the adapter owns the raw body/signature; the txn status *is* the idempotency record) — replay-safe as proven e2e below.

**Webhook e2e (real dev server + real SQLite, 14/14 checks)** — this is what unit tests couldn't prove, and it surfaced two real integration facts:

- Route/registration: `POST /api/payments/stripe/webhooks` (adapter mounts `endpoints/webhooks.js` → path `/webhooks` under the payments prefix). **The adapter (and route) only exist when `STRIPE_SECRET_KEY` is set** — keyless dev correctly 404s.
- **Conditional schema**: plugin-ecommerce adds `paymentMethod` + the `stripe` group on `transactions` *only when payment adapters exist*. A keyless-created SQLite DB lacks those columns, and **prod (`next start`) never pushes schema** → webhook 500 (`no such column: payment_method`) for keys-added-later deployments. Self-healing on this machine: dev boot with keys set runs `push: true` and adds the columns (verified); production deploys must migrate before flipping keys on.
- Checks: tampered signature → 400, expired timestamp → 400 (outside 300s tolerance); valid `payment_intent.payment_failed` flips a seeded pending txn → `failed`; valid `payment_intent.succeeded` → exactly one order (`processing`), txn `succeeded` with order link, inventory decremented by line quantity; **replay of the same event → no second order, no double-decrement**; full `charge.refunded` → txn + order `refunded`; refund replay no-op; DB restored to baseline (0 orders / 0 txns / original inventory) after cleanup.
- **Env gotcha**: `pnpm dev` runs through **turbo strict env mode**, which strips shell-injected env vars (e.g. `set STRIPE_SECRET_KEY=…&& pnpm dev`) — keys must come from `.env` (loaded by the child) or `pnpm dev --env-mode=loose`. `pnpm start` (no turbo) inherits normally.

**Load test (`scripts/load-test.mjs`, root script `pnpm loadtest`, zero deps)** — untimed warm-up per target + exact job claiming (fixed an early worker-cursor race that overshot counts), p50/p95/max + status breakdown. Against the **production build** (`next start`, concurrency 25, n=75 each):

| Target | p50 | p95 | errors |
| --- | --- | --- | --- |
| `GET /api/builder/index` | 719.7 ms | 768.3 ms | 0 |
| `GET /api/products?limit=10` | 241.1 ms | 251.2 ms | 0 |
| `GET /` | 31.2 ms | 57.0 ms | 0 |
| `GET /builder` | 31.1 ms | 47.8 ms | 0 |

Phase B — `POST /api/builder/builds` (n=60): **400×29 + 429×31** — zod validation + the 30/min in-memory limiter both hold under concurrency (the warm-up POST consumes one of the 30 window slots, hence 29/31). A first run against `pnpm dev` showed 8–17 s p50s — that is dev/Turbopack cold-compile, not production latency (numbers above supersede it).

Verified: **123/123 tests** (lib 65, plugin-shop 19 incl. #53–58, plugin-pc-builder 35, web 4), `pnpm -r typecheck` clean, `pnpm lint` 0 problems (real gate), production build clean, webhook e2e 14/14, load test clean, keyless dev smoke `/ /builder /admin` + APIs 200 after env restoration.

## 2026-09-28 (12) — Entry-11 review round + dependency audit to zero + CI gates

**Review of entry 11 (`code-review-checklist` skill)** — verdict **SHIP** after three fixes:

1. **Tests missing for the access fixes** (Finding 1): added 8 unit tests, #45–#52 — `apps/web/src/collections/Users.test.ts` (create/delete admin-only, update admin/self-by-id (string *and* number)/others-403/anon, read anon-false/admin-true/self-`where`, `roles` field admin-only), `plugin-shop/collections/media.test.ts` (write staff+/read public, exact jpeg/png/webp/avif whitelist, no SVG), `plugin-pc-builder/collections/configured-builds-access.test.ts` (read: anon/staff/manager/admin true vs owner-`where` fallback; write: admin true vs owner-scoped `where`). Added `vitest` + `test` script to `apps/web` (was missing entirely).
2. **`BMR_URL` trailing slash** (Finding 2, correctness edge): csrf allowlist normalizes `/\/+$/` so `BMR_URL=https://x.com/` doesn't reject the canonical origin.
3. **`isStaff` type** (Finding 3, consistency): `media.ts` access param/casts now `roles?: string[] | null`.

Live probe of the one gap unit tests can't prove (where-scoping applied to the *target doc*): guest build created, `staff@…` PATCH/DELETE of it → **403/403**, admin cleanup delete 200. Full suite **117/117**, typecheck 5/5.

**Dependency audit (`pnpm audit --prod --audit-level high`, checklist #9)** — started at **35 vulns (2 critical, 14 high)**, all transitive:

- Bulk were **Next.js** advisories on the pinned `15.2.9`, incl. two 2026-09 criticals (Windows-hosted RCE, Image Optimization RCE — OSV: both fixed `≥15.5.24`/`≥16.3.3`). Payload 3.90.2's peer window is `… || >=16.3.3 <17.0.0` (15.5 *excluded*), so the only fix path satisfying both = **next `15.2.9 → 16.3.6`**.
- Upgrade verified end-to-end: install + peers clean, tests 117/117, typecheck, Turbopack production build clean (35–57 s), dev boot clean, smoke `/` `/admin` `/builder` `/cart` `/sitemap.xml` 200, `GET /api/builder/index` 200 with the expected 31 components / 42 rules / 9 categories, admin login + `/users/me` 200 under CSRF.
- Residual `sharp`/`PostCSS` highs cleared transitively by the Next 16 dependency line; last remaining was **esbuild 0.18.20** (moderate, GHSA-67mh-4wv8-2f99) via `drizzle-kit → @esbuild-kit/*`. Forced to `0.25.12` with a pnpm override — note: **pnpm 12 no longer reads `pnpm.overrides` in package.json**; the override lives in `pnpm-workspace.yaml`. Drizzle push/dev boot, tests, build all re-verified after the override.
- Final: **`pnpm audit --prod --audit-level high` → "No known vulnerabilities found" (0 vulns)**.

**CI hardening (`.github/workflows/ci.yml`)**: audit step `|| true` removed → high/critical now **blocking** (checklist #9) and it passes clean; new **Secret scan step** (checklist #7) — `git grep` for AWS/GitHub/OpenAI/Slack key shapes + PEM private-key headers, fails the run on any hit (verified clean on the current tree).

**Admin training doc** (Phase 4 deliverable): new [`docs/admin-training.md`](../admin-training.md) — role matrix (verified against code: products `admin|manager`, pages `isManager`, media staff+, refunds admin-only, orders status staff+), media rules (jpeg/png/webp/avif, SVG rejected), pages drafts/publish + `isHomepage` flag, builder operations incl. CSV import, order lifecycle (`pending→processing→succeeded/failed/cancelled/expired/refunded`), troubleshooting table (CSRF/`BMR_URL`, rate limits, webhook, SQLite push races), safety rails.

Verified: **117/117 tests** (lib 65, shop 13, pc-builder 35, web 4), `pnpm -r typecheck` clean, production build clean, dev smoke 200 (incl. `/terms` `/privacy`), audit zero.

## 2026-09-28 (11) — Phase 4 security review (`security-review` skill) + fixes

Full audit of custom endpoints/collections against [11-access-security.md](11-access-security.md) (checklist + access matrix), probed live with a seeded low-privilege account. Findings, all fixed in the working tree:

1. **CRITICAL — Users collection privilege escalation** (`collections/Users.ts`): `create`/`update`/`delete` were `Boolean(req.user)` (unscoped) and `roles` had no field-level write access — any authenticated user could `PATCH /api/users/:anyId {"roles":["admin"]}` (or reset anyone's password). Reproduced: staff-probe PATCHed the manager account → `roles:["admin"]` (200). Fix: `read` = admin-all or self-only `where`; `create`/`delete` = admin-only; `update` = admin or self-by-id; `roles` field `create`/`update` = admin-only. Post-fix probes: self-escalation returns 200 with `roles` stripped (staff), cross-user PATCH 403, user create 403, read-others 404, list `totalDocs=1` for staff; admin manage + `/users/me` still work. Probe data cleaned (staff-probe user deleted, manager role restored to `['manager']`).
2. **HIGH — media collection over-shared** (`plugin-shop/collections/media.ts`): write was `Boolean(req.user)` (any customer) and `mimeTypes: ['image/*']` would accept SVG (stored-XSS vector when the file URL is opened directly) — both deviate from the matrix (write = staff+) and checklist #8. Fix: write = `admin|manager|staff`, `mimeTypes` = jpeg/png/webp/avif. Probes: anon upload 403, admin SVG upload 400 (Payload's own harmful-SVG detector agrees).
3. **MEDIUM — configured-builds access ignored the matrix** (`plugin-pc-builder/collections/configured-builds.ts`): read/update/delete were owner-only, so staff/manager/admin could not read *any* builds (admin list returned `totalDocs=0` with guest builds present) while the matrix says staff/manager read, admin write. Fix: read = staff+ or owner `where`; update/delete = admin or owner. Probes: anon list 403, admin list sees all (total 6), owner scoping unchanged.
4. **MEDIUM — no CSRF origin allowlist** (`payload.config.ts`): `csrf` was unset, so payload accepted cookie-JWTs from *any* `Origin` (verified: authenticated REST with `Origin: http://evil.example`). Fix: `csrf: [BMR_URL, localhost:3000, 127.0.0.1:3000]` per checklist #2. Probes: evil origin → `user:null` (rejected), allowed origin → full session, cookie confirmed `HttpOnly; SameSite=Lax`. **Ops note: `BMR_URL` must be set in prod or cookie auth rejects requests lacking Origin/Sec-Fetch-Site.**
5. **LOW — internal error messages leaked to public endpoints** (`pc-builder/endpoints.ts` index/conflicts `bad(500, e.message)`; `shop/endpoints.ts` add-build): DB/driver messages returned to unauthenticated callers. Fix: log server-side, generic body; payload `APIError` status <500 still passes through (user-facing reasons).

Checked-OK (researched, not findings): zod on every custom POST body/query + in-memory `rateLimit` on public POSTs (builds 30/min, use-template 30/min, add-build 30/min, validate 20/min, newsletter 5/min — spec said Upstash; in-memory is single-instance only, see watch items); Stripe webhook = official `@payloadcms/plugin-ecommerce` adapter (signature verification + raw body); price recompute server-side; `/builder/rules/import` admin+manager gated; share endpoint scoped by 96-bit `randomBytes(12)` shareId with field whitelist (no `user` leak); `dangerouslySetInnerHTML` only in JSON-LD sinks behind `serializeJsonLd` (`<` → `<`); stock/conflicts queries parameterized; engine index (rules included) is the sanctioned public view per matrix line 22.

Verified: **109/109 tests**, `pnpm -r typecheck` clean, production build clean, dev smoke home/builder/index/`/users/me` all 200 with admin session under the new CSRF policy.

## 2026-09-28 (10) — Admin-GUI wiring audit + power-rule bug fix + products↔builder linkage

Audit (subagent + manual) of "does the admin GUI have all the wires" for builder/composite config found four dangling wires; all fixed in the working tree:

1. **Power-rule production bug (TDD, tests #40–#43)**: `rule-engine.ts` hard-coded `entry.categoryId === 'psu'` while real category ids are numeric strings (`'6'` for the PSU slot) → the PSU-insufficient warning **never fired in production** (unit fixtures passed only because they used slug ids). Also `derived-power-rules.targetCategory`/`severity` were editable in admin but ignored (`builder-index` fetched without depth). Fix: `DerivedPowerConfig` gains `severity?`/`targetCategoryId?`/`targetCategorySlug?`, resolved in `createRuleEngine` (configured id → slug match → legacy `'psu'`); `Warning.severity` widens to `'error' | 'warning' | 'info'`; severity `error` routes the power issue into `validateSelections.errors` (hard block), default stays advisory; `buildBuilderIndex` passes the fields through (`depth: 1` on derived-power-rules). Live: index now carries `{"targetCategoryId":"6","targetCategorySlug":"psu","severity":"warning"}` and i7-14700K + RTX 4070S + RM650x produces "PSU insufficient: system draw ~715 W … 650 W" — impossible before.
2. **`build-templates.basePrice` claimed computed, wasn't**: field is admin-readOnly with "Computed from slots server-side" but nothing computed it (seed wrote it manually). Added pure `slotComponentIds`/`templateBasePrice` (TDD, 6 tests) + `beforeChange` hook (resolves slot components at depth 1, Σ variant `priceInEUR`, 0 when no slots) + `afterChange`/`afterDelete` `revalidatePath('/builder')` + `'/'` (dynamic `next/cache` import in try/catch — safe no-op outside the Next runtime). Probe: clobber `basePrice=0` → next update recomputes to 147200.
3. **Products ↔ builder linkage missing** (products.md:27-28): pc-builder now injects a **Builder** tab into the shop's products collection at config time (`withBuilderTab` — TDD 5 tests: append to existing tabs, create when absent, idempotent, admin-only field access) carrying `isComponent` (public read, admin read-only) + `component` (rel → components, field-level `access.read: req.user` = admin-only). `Components.afterChange`/`afterDelete` keep it synced from the variant side (`product-links`/`product-sync`: component → variant → product; stale links cleared; best-effort try/catch so a component save never blocks). Backfill for pre-existing DBs: `pnpm --filter @buildmyrig/web backfill:links` → **31/31 linked** (3 unlinked products = monitors/keyboard, correct). Storefront CTA: product page shows "Available in the PC Builder →" when `isComponent`. Probes: anon product JSON has `isComponent` but **no** `component`; admin sees the populated relation; admin edit page renders the Builder tab.
4. **Rule-manager had no nav entry**: added `RuleManagerNavLink` (client, mirrors native `nav__link` markup) via `admin.components.afterNavLinks` + `payload generate:importmap`. Probe: `/admin` HTML contains `nav-compatibility-rules`.
5. **`powerDefaults` option was declared-but-never-read**: `setPowerDefaults(pluginOptions.powerDefaults)` at config time (same pattern as `registerLineItemType`), merged into `builder-index` power config with data taking precedence.

Verified: **109/109 tests** (lib 65, plugin-pc-builder 33, plugin-shop 11), `pnpm -r typecheck` clean, production build clean, `payload generate:types` (isComponent/component) + `generate:importmap` (nav link) regenerated, live probes as cited above; test-mutated template description restored from seed data.

**Review round (`code-review-checklist`) — 3 findings, all fixed:**
1. Stale `targetCategoryId` (deleted category) silently killed the power warning — resolution now tries each candidate as id *then* as slug (configured id → configured slug → legacy `'psu'`), test #44 (RED→GREEN).
2. Power-config mapping in `builder-index` had no tests — 3 tests added (severity + populated targetCategory passthrough, `powerDefaults` merge with rule-doc precedence, engine defaults).
3. `Warning.severity` can now be `'error'` but `WarningsPanel` only styled `info` — added `warning-item--error` class + `--color-danger` CSS.

Watch item: SQLite `push: true` produced non-idempotent `CREATE INDEX … already exists` errors when a `payload run` push raced the dev server's own push — it converged on retry, but avoid concurrent pushes.

Deferred to Phase 4 (from the same audit): access-matrix tightening, rule-manager feature deltas (inline edit/export/CSV preview beyond the current grid), Build Stats view, `rulesVersion`/cache-invalidation hooks.

## 2026-09-28 (9) — Phase 3 code review (`code-review-checklist`) + fixes

Findings (all fixed, working tree):

1. **JSON-LD `</script>` breakout (XSS)**: raw `JSON.stringify` was written into `dangerouslySetInnerHTML` (`lib/jsonld.tsx` `JsonLd`, FAQ block) — any CMS field containing `</script>` (product title, FAQ question) would close the script tag and allow markup injection. Fix: `serializeJsonLd()` rewrites `<` to the JSON escape `\u003c` and is now used by both sites. Probe: FAQPage JSON-LD renders intact on `/faq`.
2. **Dead export**: `renderPageBySlug` in `lib/page.tsx` had zero callers (the `[slug]` route fetches inline for `generateMetadata`) and duplicated that logic — removed with its unused imports (`ReactElement`, `notFound`, `PageRenderer`).
3. **Hero `video` variant was a no-op** (10-blocks spec: variant image/split/video): added a `videoUrl` field to the Hero block definition (admin help text), a host-detecting `embedUrlFor(url)` helper in `@buildmyrig/lib` (TDD: 4 tests — youtube watch/youtu.be/vimeo → player URL, unknown host → `null`, no cross-provider embeds), and a 16:9 iframe render in `Hero.tsx` (image still wins when no valid video URL).
4. **`use()` helper name** in `TemplatesCarouselClient.tsx` (reads like a hook) → `selectTemplate`.

Checked and *not* a finding: framer `animate().then()` is valid (`AnimationPlaybackControlsWithThen` in motion-dom 13); CartBadge has no hydration risk (`EcommerceProvider` starts `cart` as `undefined`, loads async — server and first client render match); newsletter route error paths (400/429/502) covered by earlier probes.

Verified: **86/86 tests** (lib 60, plugin-pc-builder 15, plugin-shop 11), `pnpm -r typecheck` clean, `payload generate:types` regenerated (`videoUrl`), live probes: `/`, `/about`, `/faq`, `/terms`, `/privacy`, `/contact` all 200 with real content, unknown slug 404, FAQPage + Organization JSON-LD present.

## 2026-09-28 (8) — Phase 3 (pages + 12 blocks + SEO + newsletter + animations)

- **Pages collection** (`apps/web/src/collections/Pages.ts`): title/slug/layout (12 blocks)/seo/isHomepage, drafts on, public read `published` only (staff read all), manager write. `isHomepage` uniqueness via `beforeChange` hook (a `unique` checkbox would also constrain multiple `false` rows - A/B probe verified both directions); `afterChange` `revalidatePath('/')` + `/<slug>` wrapped in try/catch (safe no-op outside the Next runtime, e.g. `payload run`).
- **SEO plugin**: added `@payloadcms/plugin-seo`; its `fields` override only controls the *inner* fields (group name `meta` is hardcoded), so `seoFieldsPlugin` wraps the plugin and renames the group to the plan's `seo.*` after it runs. Plus `categoryTopBlocksPlugin` (bounded Hero+CtaBanner zone on category pages, per 10-blocks composition map).
- **12 blocks** (`apps/web/src/blocks/`): definitions.ts + registry.tsx (blockType -> component) + PageRenderer (unknown blockType -> server warn + skip, never crashes). Server blocks fetch their own data (ProductGrid, TemplatesCarousel with rendered templates); NewsletterSignup is the client block.
- **Routes**: `/` renders the `isHomepage` page's blocks (ISR 60s + on-demand revalidate) with the Phase-1 hardcoded homepage kept as fallback (`app/_HomeFallback.tsx`) when no homepage doc exists; marketing/legal pages served by one root `app/[slug]/page.tsx` (published-only, `notFound()` otherwise - explicit folders like `/cart` always win over it) instead of five hardcoded routes.
- **Newsletter**: `POST /api/newsletter` - zod email, 5/min/IP via `@buildmyrig/lib` rateLimit, sends via Resend only when `RESEND_API_KEY` + `EMAIL_FROM` are set, otherwise `{ok:true, dryRun:true}` + log.
- **SEO surface**: `sitemap.xml` (1h revalidate: home, builder, category/product/page/template URLs), `robots.txt` (disallow admin/account/cart/checkout/api), JSON-LD Organization sitewide (root layout), Product+Offer+BreadcrumbList on product pages, ItemList+BreadcrumbList on category pages, FAQPage inside the FAQ block; `generateMetadata` for pages (`seo.*` with title fallback) and category pages.
- **Animations (07 §4)**: `CartBadge` in the header (spring pop ~150ms on count change, anchor id `cart-anchor`), `flyToCart` 350ms chip flight used by product AddToCartButton and builder summary add-to-cart, share-copy label pop in SummaryClient; all respect `prefers-reduced-motion`. Dialog/sheet scale row is N/A until FilterDrawer/CartDrawer exist.
- **New lib helpers (TDD)**: `lexicalToPlainText` + `embedUrlFrom` in `@buildmyrig/lib` (8 new tests) - tests caught two real bugs in the original inline versions (walk never descended into `root`; naive `join(' ')` double-spaced inline nodes).
- **Seeding**: `pages-seed.ts` (idempotent by slug: home, faq, about, contact, terms, privacy with the plan's composition map) called by `seed.ts` and standalone via `pnpm --filter @buildmyrig/web seed:pages` (created 6 pages on the dev DB; revalidate warnings there are the expected non-Next-runtime fallback).
- **Verified**: tests 82/82 (lib 56, plugin-pc-builder 15, plugin-shop 11), `pnpm -r typecheck` clean, production build clean. Live probes: `/` renders hero/carousel/product grids/featured/logos/testimonials/newsletter; `/about /faq /terms /privacy /contact` 200; unknown slug 404; `/admin /builder /cart /shop/gpus /product/...` still 200; Organization/FAQPage/Product/ItemList JSON-LD present; sitemap+robots content correct; newsletter 200/400/429; anon `POST /api/pages` 403; `topBlocks` present on category docs.

## 2026-09-28 (7) — Code review of 2d+2e (`code-review-checklist`) + hardening fixes

Findings (all reproduced by probe first, then fixed; uncommitted working tree):

1. **Phantom slot ids → 500 (FOREIGN KEY)**: the rule engine silently skips unknown ids, so `POST /api/builder/builds` with a nonexistent category/component reached `payload.create` and FK-failed. Fix: pure `findUnknownSlotRefs(index, slots)` guard (TDD) — flags unknown category, unknown component, and component-filed-under-another-category — wired into the save endpoint (422 + reasons), the `configured-builds` beforeChange hook, and `resolveConfiguredBuildLine` (deleted-part case). Probe: phantom save now **422** with `["Unknown category \"999999\"", "Unknown component \"999999\""]`.
2. **Hook throws plain `Error` → Payload `routeError` masks as generic 500**: `resolveConfiguredBuildLine` + `validateConfiguredBuild` now throw `APIError(msg, 422)` (`isErrorPublic` surfaces any status ≠ 500). Probe: cart PATCH on an incompatible build returns **422 with the full per-slot reason** (was `Something went wrong.`).
3. **Raw REST `POST /api/configured-builds` was open** (`create: () => true`): bypassed the endpoint rate limiter, allowed `user`/`status`/`shareId` spoofing, and triggered an unauthenticated 4-query index build per request. Fix: `create` is staff-only (`requireStaff`); guest saves keep working through the rate-limited endpoint with explicit `overrideAccess: true`. Probe: anon raw create → **403**, endpoint save → 200.
4. **`confirmOrder` swallows every error** (its try/catch returns a generic 500), so the orders-hook gate could never deliver per-slot reasons to the browser. Fix: `POST /api/carts/:id/validate` (zod body, **20/min/IP**, owner-or-secret access, aggregates reasons via TDD `collectBuildIssues`) + checkout page pre-flight before `initiatePayment`. Probes: healthy cart → `200 {ok:true, checked:1}`; after importing a breaking rule → **422 with the exact reason**; rule removed → 200 again; wrong secret / missing cart → 404 (no existence leak); hammering hits **429** at the limit.
5. **Rate limiter memory growth**: stale keys were never pruned and spoofed `x-forwarded-for` keys grew the map forever. Fix: sweep every `windowMs` + `maxKeys` hard cap (default 10 000, evict oldest-inserted) + `stats()` (TDD).
6. **`Number(cartID)`** would NaN future non-numeric (Postgres uuid) ids → `coerceDocId` (numeric string → number, otherwise string); `addItem` arg cast `as number` (`DefaultDocumentIDType` resolves to the app DB id type).
7. **Orders hook re-validated on every webhook status update** (rebuilding the index + rewriting configured-build snapshots for nothing) → `validateBuildsAtCheckout` is create-only (TDD).
8. Bounds: `buildsSchema` caps 64 slots / 32 component ids per slot; `createBuildFromSlots` maps hook `APIError` (<500) to its status instead of 500-ing.

Verified: **74/74 tests** (lib 48, plugin-pc-builder 15, plugin-shop 11), typecheck 5/5, production build clean, REST e2e as cited above + regressions: valid save 200 (€628.00), add-build 200 subtotal 62800, `/build/<shareId>` 200, bad share 404, `/`, `/checkout`, `/cart`, builder routes all 200. Dev-server log shows only the deliberate `APIError` entries from the probes. Known gaps unchanged (no Playwright, no ESLint config, no seed media).

## 2026-09-28 (6) — Phase 2e: build save/share + composite cart line + checkout validation

- **Engine `validateSelections`** (TDD, tests #31–#39): validates a FIXED selection set — every selected pair checked against blocking rules. Unlike `evaluate()` (which only filters unselected candidates), this is the server-side gate for saved builds. Includes the derived power warning.
- **Dynamic mirror fix** (found by e2e, the important one): mirrored bidirectional rules used a STATIC value, so selecting an AM5 board made the mirror of "i5-14600K requires LGA1700" block ALL AM5 CPUs — valid builds were rejected. Mirrors with a category subject now compute their reverse check dynamically from the selected component's actual spec (the selected board's socket drives the CPU filter). Excludes-mirrors use the symmetric "selected side matching V blocks the subject side" semantics. Test #6 updated to the correct semantics; #38/#39 cover validateSelections mirror behavior.
- **Line-item registry** (`packages/lib/line-items.ts`, TDD): `registerLineItemType` / `getLineItemType` / `getLineItemTypes` — the shop ↔ builder bridge. plugin-pc-builder registers `configured-build` at config time; plugin-shop's cart/order hooks call the registered `resolveLine`. Neither plugin imports the other.
- **Rate limiter** (`packages/lib/rate-limit.ts`, TDD): in-memory sliding window (single-instance; swap for Upstash in multi-instance prod). 30/min/IP on `POST /api/builder/builds` and `/api/builder/templates/:id/use`, 429 + `Retry-After`.
- **Endpoints** (plugin-pc-builder): `POST /api/builder/builds` (zod-validated slots, server re-validates + re-resolves price from live variant prices — the client never sends a price; guests allowed, `user` set when authed), `GET /api/builder/builds/:shareId` (public-safe view, no owner PII), `POST /api/builder/templates/:id/use` (popularity++ + creates a build), `GET /api/builder/stock/:categoryId` (top-5 alternatives, slug-or-id category, numeric-id coercion).
- **Cart integration** (plugin-shop): carts/orders items gain `lineType`/`configuredBuild`/`buildName`/`subItems` fields (soft slug references, no builder import). `wrapCartBeforeChange` wraps the ecommerce default hook — it crashed on product-less items (composite lines); standard items delegate untouched, composite prices are server-resolved via `resolveLine` and added to the subtotal. `POST /api/carts/:id/add-build` (collection endpoint — collection paths are matched relative to the slug) calls the exported `addItem` operation with the composite item; the subtotal hook re-validates + prices it. `validateBuildsAtCheckout` on orders re-validates every build line at order creation (throws → checkout aborts with per-slot reasons). Guest carts on (`allowGuestCarts: true`), composite matcher merges same-build quantity.
- **resolveLine** (plugin-pc-builder `lib/builds.ts`, TDD): loads the build (overrideAccess — server-internal), re-validates via the engine, re-resolves price from current variant prices, overwrites `priceSnapshot` + bumps `status: 'addedToCart'`, returns `{ price, subItems, fulfillmentUnits }`. Throws on missing/incompatible build.
- **Web**: summary page CTAs live — Share (save → copy `/build/[shareId]`), Add-to-cart (creates cart if needed, `POST /add-build`, refreshCart), Save (disabled — no auth UI yet). `/build/[shareId]` public read-only page with "Duplicate this build" → `/builder/configure?build=<shareId>` (hydrates the draft server-side). Cart page renders composite lines with expandable sub-items; checkout page lists cart items. `?template=` and `?build=` both hydrate the configurator draft.
- **Data fixes**: `push: true` on the SQLite adapter (dev schema auto-apply — prod uses Postgres migrations); seeded templates now `_status: 'published'` (carried over from 2d).
- Verified: **64/64 tests** (lib 46, plugin-pc-builder 10, plugin-shop 8), typecheck 5/5, production build clean, REST e2e: valid build save 200 (€658.00 = 379+279), invalid save 422 with readable reasons, composite add-to-cart 200 with **subtotal 65800 server-resolved**, share read 200, bad share 404, template-use 200, stock 200, `/build/<shareId>` 200 with content, bad share page 404, all builder/cart/checkout routes 200.
- Known gaps: no browser-level verification yet (no Playwright in repo); `pnpm lint` still unrunnable (no ESLint config anywhere — pre-existing); no media in seed → cards render without images; option list not virtualized; mirror messages use the forward-direction template (read oddly in reverse — seed data issue); multi-select categories use the first selected entry for dynamic mirrors; SQLite push is dev-only (prod runs `payload migrate`).

## 2026-09-28 (5) — Phase 2d: configurator UI (landing + step flow + rail + summary stub)

- **Index display data**: `ComponentSpecEntry.display` (`name`, `brand`, `image`, `description`, cosmetic `specs` from `specsJson` — primitives/primitive arrays only, ≤16 keys) and category `helperText`/`icon` added to `BuilderIndex`. The engine now interpolates `{componentA}`/`{componentB}` from `display.name` (falls back to id), so rule messages read "Ryzen 7 7800X3D does not fit ASUS ROG Strix B650-A" instead of raw ids — tests #29/#30.
- **Tests**: `packages/plugin-pc-builder` now runs vitest (`src/lib/builder-index.test.ts`, 4 cases: display mapping, cosmetic-spec whitelist, sparse display, category helperText/icon). Total suite 34/34.
- **`/builder`** (RSC, ISR 60s): three choice cards (scratch → resets draft; guided → dialog; template → scroll to carousel), guided dialog (budget slider × use-case × tier → nearest template by price-distance + tag match, Escape closes), template carousel (framer-motion stagger, empty state → scratch CTA).
- **`/builder/configure`** (RSC shell + client): fetches `GET /api/builder/index` (loading skeleton + error/retry), Zustand persisted draft (`buildmyrig-draft-v1` — survives refresh, hydration-gated to avoid SSR mismatch), step chips with required/optional + done badges, `AnimatePresence` step transitions (slide 24px, 250ms), option cards filtered live by the same engine the server uses (excluded cards dimmed + interpolated reason, warn badges, typed + cosmetic spec chips), search/brand filter bar with reset, build rail (slot list with remove ×, `useSpring` animated total, warnings panel, "Recommended PSU ≥ X W" chip, Review button gated on required slots).
- **`/builder/summary`**: read-only build sheet from the draft (grouped rows, component total, missing-required alert, server re-validation note). Save/Share/Add-to-cart CTAs present but disabled — they land in Phase 2e with `POST /api/builder/builds` + `registerLineItemType`.
- **Store semantics**: single-select replaces; multi-select caps at `maxSelectable` (drops oldest); `?template=<id>` hydrates the draft server-side (template slots fetched in the RSC, no extra endpoint).
- **Data fix**: seeded build templates were `_status: 'draft'`, so the landing page's published-only query returned none — seed now writes `_status: 'published'` and the 2 existing rows were published via local API.
- **Deps**: `zustand` + `framer-motion` in `@buildmyrig/web` (per [07-ux-plan.md](07-ux-plan.md)); `vitest` in plugin-pc-builder.
- Verified: 34/34 tests, typecheck 5/5, production build clean, smoke 200 on `/`, `/builder`, `/builder/configure`, `/builder/configure?template=2`, `/builder/summary`, `/api/builder/index` (31 components with display + 43 rules / 9 categories incl. helperText).
- Known gaps: no browser-level verification yet (repo still has no Playwright — e2e remains Phase 1/4 blocked); `pnpm lint` is unrunnable repo-wide (no ESLint config exists — pre-existing); seed uploads no media, so option/template cards render without images (`display.image` is wired and used when present); option list is not virtualized (31 components today, revisit at 5k); accordion "power mode" stays in backlog.

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
| 2 PC builder — configurator UI | ✅ done — `/builder`, `/builder/configure`, `/builder/summary` (share/cart CTAs deferred to 2e) |
| 2 PC builder — summary share + composite cart line + checkout validation | ✅ done — builds save/share endpoints, `add-build` composite line, orders re-validation |
| 2 PC builder — admin GUI wiring audit + power-rule fix + products linkage | ✅ done (entry 10) — power rule fires on real ids, basePrice hook, Builder tab + sync + backfill, nav link |
| 3 Blocks + animations | done - Pages + 12 blocks + registry, homepage/marketing routes, sitemap/robots/JSON-LD, newsletter endpoint, sec-4 badge/fly/share animations |
| 4 Hardening & launch | in progress — security review + access fixes (entry 11), review round + dependency audit at zero + CI audit/secret gates + admin training doc (entry 12), entry-12 review + lint gate repair + Stripe webhook handlers w/ e2e idempotency proof + load test (entry 13), admin-GUI deltas + access-matrix tightening + footer/legal + cache/`rulesVersion` + analytics + live matrix verification (entry 14); remaining: Stripe test keys e2e, Playwright/Lighthouse gates, Sentry/alerting, Postgres migrations dry-run |
## Known gaps / watch items

- **`BMR_URL` must be set in production** — it feeds the `csrf` origin allowlist; without it, cookie-authenticated requests lacking `Origin`/`Sec-Fetch-Site` are rejected (checklist #2, entry 11).
- Rate limiting is in-memory (`@buildmyrig/lib` fixed window), not Upstash as the matrix sketched — fine for single-instance/self-host, ineffective across serverless instances (documented deviation, entry 11).
- Next.js is on `16.3.6`; payload's peer windows for `next` are narrow (e.g. `>=15.4.11 <15.5.0 || >=16.3.3 <17.0.0` — 15.5 line *excluded*) — check `@payloadcms/next` peerDependencies before any future next bump, or the 16.3.3+ criticals return (entry 12).
- `esbuild@0.18.20 → 0.25.12` is a pnpm override in `pnpm-workspace.yaml` (pnpm 12 ignores `pnpm.overrides` in package.json) — keep it in sync when drizzle-kit/`@esbuild-kit/*` are upgraded (entry 12).

- Playwright e2e and checkout DoD blocked on Stripe test keys in `.env` (owner action).
- Dev DB is SQLite fallback (Docker absent on this machine); Postgres parity verified only in CI plan.
- SQLite `push: true` is not idempotent under concurrent pushes (dev server + `payload run` racing produced `CREATE INDEX … already exists`) — it converged on retry; avoid running `payload run` while the dev server is pushing schema.
- Product spec table reads `specsJson`; per-category facet sidebar is hardcoded brand/price for now — attribute-driven facets land with builder work.
- **turbo strict env mode strips shell-injected env vars** from `pnpm dev` tasks — put keys in `.env` (the child process loads them) or run `pnpm dev --env-mode=loose` for one-offs (entry 13).
- **`transactions` schema is conditional on Stripe keys** (`paymentMethod` + `stripe` group exist only when an adapter is configured); dev push self-heals when keys are first set, but production must migrate schema *before* enabling keys or the webhook 500s with `no such column` (entry 13).
- Load-test numbers are single-machine (`next start` on the dev box, 25 concurrent); re-run under production-like infra before capacity planning (entry 13).
- **Payload CSRF checks `Origin` on cookie-authenticated requests including GETs** — REST calls with a session cookie and no `Origin`/`Sec-Fetch-Site` return `200 {user:null}` or 401s that look like auth failures; browsers send it automatically, curl/scripts must add `-H "Origin: http://localhost:3000"` (entry 14; explains earlier smoke-test confusion).

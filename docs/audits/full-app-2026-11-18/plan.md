# Full-app audit — round 1 plan (2026-11-18)

HEAD `a4ee58d` on `main`, with 20 uncommitted files (admin CSS, Aether header, list cells, reviews a11y) audited as part of scope.
Method: code reading of risk-ranked paths, live REST probes against local dev using 5 roles (anon, customer, staff, manager, admin), a browser sweep of 16 storefront routes at 280px and 1440px, admin GUI checks as customer and as admin, `fallow` health, and the gate baseline.

## Baseline (pre-existing, all green)

| Gate | Result |
| --- | --- |
| `pnpm test` | 993 passed (web 524, shop 177, builder 137, lib 102, pages 51, ui 2), 0 failed |
| `pnpm -r typecheck` | 0 errors |
| `pnpm lint` | 0 errors, 11 warnings (`no-img-element`, `no-explicit-any`) |
| fallow health | 71.2 / B, avg cyclomatic 2.3, dead exports 10.8%, 3 import cycles, 184 clone groups |

Risk ranking: money (checkout, cart, discounts, settlement) > auth/roles/admin access > data growth > theme/admin UI > docs.

## Verdict on "junior code, needs a full refactor"

Partly wrong. The commerce core is senior-grade: server-recomputed totals, field-locked cart totals, CAS plus fencing-token settlement, and role pinning on register. All of these held under live probing.
The weak layer is the UI shell added in recent rounds:
- The Aether theme was written in Tailwind on a project with no Tailwind.
- The admin nav is a static mock-up with a hardcoded identity.
- Several screens are 400–1000-line mega-components with no tests.

Recommendation: targeted refactor of about 10 hotspots (Batch D), not a rewrite.

## Findings — security and access (live-verified)

| ID | Sev | Issue | Evidence | Fix sketch |
| --- | --- | --- | --- | --- |
| C1 | CRITICAL | Unbounded growth: guest carts (251 in dev DB) and anonymous `configured-builds` have no retention. Limiters key on the client-controlled leftmost `X-Forwarded-For` and evict at 10k keys. | `packages/lib/src/rate-limit.ts:66`, `apps/web/src/lib/auth.ts:20`; no job/cron in repo | Payload jobs task to prune stale guest carts and unclaimed builds; trusted-proxy IP resolver |
| H1 | HIGH | Customers can log into `/admin`: `users` has no `access.admin`. | `/api/access` returned `canAccessAdmin: true`; customer saw the dashboard (browser); `collections/Users.ts:83` | `access.admin: isStaff` + test |
| H2 | HIGH | Customers can read `payload-locked-documents` (leaks staff user ids and docs under edit) and create query presets shared with "everyone", which then show up in staff list views. | Live: locked-docs 200 for customer, preset POST 201 | Staff-only access on both system collections (config `lockDocuments` / `queryPresets` access) |
| M1 | MEDIUM | No CSP, `frame-ancestors`/XFO, HSTS, nosniff, or Referrer-Policy; `X-Powered-By: Next.js, Payload` is sent. Clickjacking risk on `/admin`. | Live response headers; `next.config.mjs` has no `headers()` | `headers()` + `poweredByHeader: false` |
| M2 | MEDIUM | Discount-code oracle: anonymous `/api/discounts/validate` confirms valid codes and their value, rate-limited only by spoofable IP. | Live: `WELCOME10` returns `valid: true, discountTotal` | Require a cart secret; cap per cart; constant response shape |
| M3 | MEDIUM | Newsletter mails any address with no opt-in or persistence: a mail-relay vector, and subscribers are never stored. | `api/newsletter/route.ts:41` | Store pending subscriber + double opt-in, or remove the feature |
| M4 | MEDIUM | `confirm-free` trusts the stored `cart.total`, which is recomputed only on the last cart write. Admin changes to a discount value, shipping band, or tax rate after apply are ignored, because re-validation checks validity only. | `plugin-shop/src/endpoints.ts` confirm-free total check | Call `recomputeCartTotals` in-memory before the `<= 0` check |
| L1 | LOW | Rules-import 500 echoes the internal error message; conflicts endpoint returns 401 to a signed-in non-staff user (should be 403). | `plugin-pc-builder/src/endpoints.ts:66,725` | Generic message; 403 |
| L2 | LOW | Reviews POST: a missing product throws, giving 500 not 404. Any `payload-token=` cookie skips the origin and rate-limit gate. | `api/reviews/route.ts:32,95` | `disableErrors`; verify the session instead of sniffing the cookie |
| L3 | LOW | `confirm-free` `customerEmail` is not email-validated. CSRF allowlist always includes localhost, even in production. | `endpoints.ts` schema; `payload.config.ts:81` | `z.string().email()`; localhost only when `NODE_ENV !== 'production'` |

## Findings — admin GUI

| ID | Sev | Issue | Evidence | Fix sketch |
| --- | --- | --- | --- | --- |
| H3 | HIGH | Nav footer is hardcoded to "Administrator / admin@buildmyrig.test" for every user. Nav sections and counts are static and not filtered by permissions (a customer sees Transactions, Users, Plugins). | Browser as customer; `ModernAdminNav.tsx:67,516-517` | `useAuth()` for identity; filter by `usePermissions()`/`useConfig` |
| M5 | MEDIUM | Dead duplicate views: plugin `RuleManagerView` (614 LOC) and `BuildStatsView` are shadowed by the app copies (1235 / 355 LOC). The fallback specifier climbs out of `apps/web` via `../../../packages`. | `plugin-pc-builder/src/index.ts:226`; `payload.config.ts:124` | Keep one copy (move into plugin, delete the other) |
| L4 | LOW | Rule title fallback drops a value of `0` (truthiness check). | `EntityListCell.tsx` `formatRuleFallback` | `!= null` check |
| L5 | LOW | Product list table overflows its container (right edge 1275px in a 1009px viewport). It scrolls inside the container, but there's no visible affordance. | Admin browser at 1440 | Sticky first column + scroll shadow |

## Findings — themes and storefront UI (browser-verified)

| ID | Sev | Issue | Evidence | Fix sketch |
| --- | --- | --- | --- | --- |
| H4 | HIGH | Aether theme uses about 99 Tailwind utility classes in 7 files, but Tailwind isn't installed, so the layout breaks (`flex` computes to `block`; hero heading clipped). | `/aether-lab` computed styles; `AetherCalculatorClient.tsx` (48), `AetherLoopVisualizerClient.tsx` (24), +5 more | Port to `aether.css` with tokens; add a lint rule banning utility class names |
| M6 | MEDIUM | Theme packs mix: Aether pages render inside the Nexus header and footer. | `/aether-lab` screenshot | Pack-scoped block registry; warn editors in admin |
| M7 | MEDIUM | Inline `style={{}}` hotspots despite the token rule: AetherCalculator 16, ThemeColorStudio 15, AetherLoopVisualizer 14, RuleManagerView 9. | grep counts | Move to classes + `var(--*)` |
| L6 | LOW | `/cart` and `/checkout` have no page title. `/about`, `/faq`, `/contact` titles lack the brand suffix. | Sweep titles | `generateMetadata` + title template |
| L7 | LOW | `/shop/<unknown>` returns 200, not 404 (soft 404: `notFound()` after `loading.tsx` streams). `.nx-rig__tools` is clipped at 280px. Pages have 2–7 targets under 24px. | Live status; sweep | Resolve the category before the Suspense boundary; wrap the tools row; 24px minimum target |

## Findings — code quality and refactor (fallow, CRAP = complexity × untested)

| ID | Sev | Hotspot | Metric | Action |
| --- | --- | --- | --- | --- |
| R1 | MEDIUM | `checkout/page.tsx` `CheckoutPage` | cyclomatic 57, CRAP 3306, untested | Split into steps (address, shipping, payment) + hooks; add tests first |
| R2 | MEDIUM | `product/[slug]/page.tsx` `ProductPage` | cyclomatic 36, CRAP 1332 | Extract data loader + sections |
| R3 | MEDIUM | `builder/summary/SummaryClient.tsx`, `seed.ts` | CRAP 812 each | Extract and test |
| R4 | MEDIUM | `rule-engine.ts` `validateSelections` / `evaluate` | cognitive 109 / 61 | Split per rule type (already well tested; safe to refactor) |
| R5 | MEDIUM | `line-item-hooks.ts` `capQuantitiesToStock` | cognitive 75 | Split resolve / cap phases |
| R6 | LOW | Import cycles: `renderBlocks` ↔ `RichTextBlock` / `Columns` / `Section` / `lexical-converters` | 3 cycles | Inject the renderer via context |
| R7 | LOW | 62 unused exports, 31 unused re-exports, 7 unused files; `clientIp` duplicated with different fallbacks (`unknown` vs `local`) | fallow dead-code | Delete; one `clientIp` in `@buildmyrig/lib` |

## Docs, workflow and context

- **L8:** `AGENTS.md` "Current status (2026-10-10)" is stale (entries now reach 138). The session-log numbering is non-monotonic ("99–110 / 43–98").
- **L9:** 5 untracked design-dump folders in the repo root contain a `package.json` (`ADMIN_GUI`, `PC_BUILDER_*`, `shop layout`, `buildmyrig-studio-admin…`). fallow warns about them and other tooling may pick them up. Move them out or gitignore them.
- **L10:** `11-access-security.md` does not mention admin-panel access (H1) or the system collections (H2). Doc sync is needed with Batch A.

## Disproved (logged so they don't recur)

- `GET /api/products` 500 for all roles: a probe artifact. Duplicate `limit` params become an array and SQLite errors with "row value misused". `?limit=3` returns 200. This is an upstream Payload input-validation quirk (LOW, not ours).
- The uncommitted inventory "row" wrap does not drop the staff-only mask: masking runs before the wrap, and anonymous products show no `inventory` live.
- Draft leak via `?draft=true`: anonymous reads return only `published` pages and products.
- Customer self-escalation: `PATCH roles:['admin']` returns 200, but the roles stay `['customer']` (field access holds). Register ignores posted roles.

## Proposed fix batches (Gate 2: approve before any code)

1. **Batch A — access and backend** (branch `audit/full-app-2026-11-18-a`): H1, H2, C1, M1–M4, L1–L3. Each gets a failing behavior test first (role × endpoint status codes, recomputed totals, prune counts). Doc sync goes to `11-access-security.md`, `03-security-access.md`, and `AGENTS.md`.
2. **Batch B — admin GUI:** H3, M5, L4, L5. Re-check in the browser as customer and as staff.
3. **Batch C — themes:** H4, M6, M7, L6, L7. UX gates: overflow (`scrollWidth` vs `clientWidth`) at 280/1440, contrast, and target size.
4. **Batch D — refactor:** R1–R7 (tests first for R1–R3, which are currently untested).
5. **Deferred:** L8–L9 hygiene; Postgres/production deploy items stay plan-level per `AGENTS.md`.

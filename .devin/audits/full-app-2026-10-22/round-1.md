# Full-App Audit — Round 1 (2026-10-22)

- **HEAD at start**: `fe8588d` (main, dirty tree: 40 modified + 18 untracked)
- **Scope**: 30 storefront routes, builder (3 + rig-studio), 16 admin routes (authenticated),
  6 public API routes, plugin cart/builder endpoints. Admin collections: lighter pass (3 prior rounds).
- **Baseline**: 869 tests / 0 failed, 0 typecheck errors, lint 0 errors + 8 pre-existing warnings.
- **After**: 886 tests / 0 failed, 0 typecheck errors, lint 0 errors + 8 warnings.

## 1. Findings & resolutions

| # | Surface | Finding | Severity | Fix commit | Status |
|---|---|---|---|---|---|
| 1 | Shared shell, all 28 storefront routes | 32px horizontal overflow at 1440 and 62px at 280 (no global `box-sizing` reset; Nexus bar never collapsed) | High | `20a203a` | Resolved, measured 0/0 |
| 2 | `/admin/globals/site-settings` | `useField` mounted on `elements.Description` (outside `<Form>`) threw on load and on every skin-card click; the choice never saved | High | `bae366e` | Resolved, save verified end-to-end |
| 3 | Homepage | 4 strings rendered CP1252 mojibake instead of an em dash (DB content) | Medium | `d02c80a` | Resolved, `repair:mojibake` |
| 4 | PDP reviews | `avgRating` fell back to `'5.0'` with zero approved reviews | Medium | `9f0f047` | Resolved |
| 5 | `/api/reviews` | "Verified Buyer" derived from the client-posted email — spoofable | Medium | `ae92d0a` | Resolved |
| 6 | Admin, 12/16 routes | 280px overflow 57–193px (skin select, non-shrinking breadcrumbs, fixed-minmax grids) | Medium | `20a203a` | Resolved (0 on 15 routes, 5px on product edit) |
| 7 | Unknown CMS slug / dead build link | `notFound()` answered 200 + noindex (segment `loading.tsx` forced streaming) | Medium | `46cc1d8` | Resolved, 404 |
| 8 | 4 custom admin views | Document title `Payload - Payload` | Low | `20a203a` | Resolved |
| 9 | Admin UI | Emoji in skin badges and the `adminTheme` select options | Low | `bae366e` | Resolved |
| 10 | 5 CMS pages, `/explorer`, empty-cart checkout | No `<h1>` | Low | `20a203a` | Resolved |
| 11 | Footer links, promo dismiss | 13px-tall / 19×24 tap targets (WCAG 2.5.8) | Low | `20a203a` | Resolved |
| 12 | `/builder/configure` | "Recommended PSU ≥ 100 W" on an empty build | Low | — | Deferred (cosmetic, needs product decision) |

## 2. Scorecard

| Metric | Round 1 | Round 2 |
|---|---|---|
| Critical | 0 | 0 |
| High | 2 | 0 |
| Medium | 5 | 0 |
| Low | 5 | 1 (deferred #12) |
| Storefront 280px overflow | 62px × 28 routes | 0 |
| Storefront 1440px overflow | 32px × 28 routes | 0 |
| Admin 280px overflow | 57–193px × 12 routes | 0 × 15, 5px × 1 |
| Pages without `<h1>` | 7 | 0 |
| Sub-24px tap targets | 2 kinds | 0 |
| Console errors (storefront) | 0 | 2 (404 path only) |
| Tests | 869 | 886 |
| False positives | 2 (both disproved before fixing) | — |

## 3. New findings (round 2)

| # | Surface | Finding | Severity | Status |
|---|---|---|---|---|
| N1 | `/not-found` render path | React warns "Encountered a script tag while rendering React component" — the pre-paint theme boot script does not execute on the client-rendered 404 | Low | **Accepted** (see §6) |
| N2 | Theme applier | `applyAdminTheme` was duplicated in `CommandPalette.tsx`, `ModernAdminNav.tsx` and `adminTheme.ts` | Low | Fixed in `e32e6fa` (site-settings path); the two nav/palette copies remain |
| N3 | `/admin/collections/products/:id` | 5px residual overflow at 280px (Payload document sidebar) | Low | Accepted |
| N4 | `lib/rule-engine.test.ts` #28 | Wall-clock assertion (`< 20ms`) fails under load (42ms measured on a busy machine) | Low | Fixed in `c43cc0b`-follow-up (best-of-3) |

## 4. Deliberately deferred backlog

- Rule-matrix virtualization above 1,000 rules (carried from admin round 3).
- Postgres/production-only paths (never exercised locally).
- Admin GUI mockup parity — tracked separately (`ADMIN_GUI/`).
- N1–N3 above.

## 5. False positives disproved in Phase 2

- "Admin build-stats 401 / rule-matrix 403 for an admin": caused by
  `e2e/audit-browser-verify.mjs` waiting on `waitForURL('**/admin**')`, which matches
  `/admin/login` — the round-3 crawl never logged in. Re-crawled authenticated: no 401/403.
  Harness fixed in `c9d9eab`; round-3's "verified live" claims and its 0px scorecard row are unreliable.
- "Reviews section missing on the PDP": `store-settings.features.reviews` is `false` in the DB,
  so hiding is correct. Flagged as a config decision, not a defect.
- "Products table clipped at 1440": measured — the table sits in an `overflow-x: auto` wrapper
  (1232px table in a 996px scroller), so the ACTIONS column is reachable. Observation only.

## 6. Round 1 follow-up (same day, from the mockup comparison)

| # | Surface | Finding | Severity | Fix | Status |
|---|---|---|---|---|---|
| 678 | Product edit, any dark skin | The `json` field rendered a **white Monaco editor** — Payload's ThemeProvider defaults to `light` unless `admin.theme` is `'all'`, so it passed the `vs` theme while our skins painted dark | Medium | `e32e6fa` | Resolved: `admin.theme: 'all'`, one shared applier writes `data-theme` + `payload-theme`, Monaco now `vs-dark` |
| 679 | Product edit sidebar | Checkbox meta-boxes overlapped: Payload renders input+label and the description as siblings in a **row** flex container, so the description sat beside a two-line label | Low | `e32e6fa` | Resolved: stacked; label/description no longer intersect |
| — | Featured/Trending labels | `⭐` / `🔥` in field labels (same doctrine breach as item 9) | Low | `e32e6fa` | Resolved |

Regression caught during verification: routing the theme-change event back through the
shared applier recursed (30× "Maximum call stack size exceeded"). The listener now applies
with `broadcast: false`. All six skins re-verified: matching `data-theme` + cookie, 0 page errors.

Also disproved: the "clipped sidebar card" seen in the full-page capture is a sticky-element
rendering artifact — at page bottom the last card sits at 764–853 inside a 900px viewport
(`lastCardVisible: true`). No fix needed.

### N1 accepted — measured, not guessed

With `localStorage.bmr_theme = 'alt'`, `/shop` comes back with `#theme-vars media="not all"` and
`#theme-alt media="all"` (boot script ran), while a 404 comes back with `media="all"` /
`media="not all"` (script never ran). So alt-theme visitors see the default theme on 404s.

Why it is not fixed here: the inline script must execute **after** the three theme `<style>` tags
exist, which is why it sits in `<body>` after them. `next/script strategy="beforeInteractive"`
hoists it into `<head>` and would run it before those nodes exist — trading a 404-only flash for a
flash on every route. The correct fix is to render the media attributes from a theme cookie
server-side (no script at all); that is a theme-architecture change, not a bug fix.


## 7. GUI review through ux-ui-gates (2026-10-22)

16 of 23 gates could not look in this environment - every browser gate reports
`playwright not installed - REQUIRED, FAILING`, and validate_contrast needs a JSON token
source while ours is CSS. Those are "not verified", not passes.

| Gate | Scope | Result (as printed) |
|---|---|---|
| lint_native_select | admin/ui | exit 0 - 28/28 files, no native select |
| validate_theme_refs | shell.css vs tokens.css | exit 0 - every reference resolves |
| validate_theme_refs | admin.css | 2 unresolved -> fixed (`--theme-radius-full`, `--theme-error-500`) |
| validate_theme_refs | admin.css + ui/ui.css | 435 refs to Payload's `--theme-*` layer; gate cannot model it (Payload defines them at runtime) |
| lint_hardcodes | admin.css | 621 px / 178 hex / 49 time - pre-existing debt; the margin block went 11 -> 2 |
| lint_hardcodes | shell.css | 17 hardcodes (px/time) - open |
| check_no_emoji | admin/ui | flags em/en dashes as pictographs and crashes on cp1252 when it finds a real one; own scan: 26 pictographs, 6 in AdminHeaderActions fixed, 20 remain in storefront/block copy |

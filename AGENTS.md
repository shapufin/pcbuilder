# AGENTS.md — BuildMyRig handoff / workflow context

Read this first in a new AI session. It is the recovery point for the whole project: state, commands, conventions, gotchas, and where the detailed docs live. Current state through entry 16 is pushed (`main` @ `fe67689`); still **do NOT commit/push unless the user explicitly asks** — the push above was an explicit request.

## What this is

Monorepo (pnpm 12 + Turborepo) for **BuildMyRig** — a custom-PC storefront: Payload CMS 3.90.2 + Next.js **16.3.6** + SQLite (dev fallback; plan says Postgres for prod), Tailwind 4, TypeScript. Path A: `@payloadcms/plugin-ecommerce` for shop/payments.

- `apps/web` — the app (storefront, `/builder` configurator, `/admin` Payload, REST endpoints).
- `packages/lib` — rule engine, rate limiter, line-item utils (heavily TDD'd).
- `packages/plugin-shop` — ecommerce wiring: collection overrides, Stripe adapter config, **webhook handlers** (`src/payments/stripe-webhooks.ts`).
- `packages/plugin-pc-builder` — builder collections/endpoints.
- `docs/buildmyrig-plan/` — the full technical plan (start at `00-index.md`); `docs/admin-training.md` — admin handbook.

## Commands (run from repo root)

| Command | What |
| --- | --- |
| `pnpm dev` | dev server (turbo → Next dev, port 3000). Background pattern: `Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','cd /d <repo> && (pnpm dev) > dev-server.log 2>&1'` (plain `Start-Process cmd /c "…"` fails PowerShell arg parsing) |
| `pnpm build` | production build (kill stale `node` processes first) |
| `pnpm start` | prod server — run from `apps/web` (bypasses turbo) |
| `pnpm test` / `pnpm -r test` | Vitest — current: **159/159** (lib 67, plugin-shop 22, plugin-pc-builder 52, web 18) |
| `pnpm test:e2e` (from `apps/web`) | Playwright e2e (6 specs: smoke/auth/builder) — needs a running server (`next start` on :3000; config reuses it) |
| `pnpm -r typecheck` | tsc --noEmit (expect 0) |
| `pnpm lint` | turbo lint — `apps/web` uses real ESLint flat config (`eslint .`), expect 0 problems |
| `pnpm seed` | reseed dev DB (31 components, 42 rules, 34 products, 2 templates) |
| `pnpm loadtest` | `scripts/load-test.mjs` — local load test (needs a running server; use prod build for real numbers) |
| `pnpm payload -- <cmd>` | Payload CLI in apps/web (e.g. `generate:types`) |

Test numbering convention: tests are numbered cumulatively across entries (#1–#100 so far; #95–100 are the e2e specs) and referenced in the progress log.

Credentials: `admin@buildmyrig.test` / `Password123!` (id1 admin, id2 manager, id3 staff `staff@buildmyrig.test`).

## Current phase status (2026-09-29)

Phases 0, 1 (minus live Stripe e2e), 2a–2e, 3 **done**; **Phase 4 (hardening) in progress**. Everything reviewed each round with the `code-review-checklist` skill; entry-level detail in `docs/buildmyrig-plan/18-progress-log.md` (reverse-chronological). GitHub: `github.com/shapufin/pcbuilder` `main` — push after each completed round (done through entry 16, `fe67689`; tree clean).

Session history (one line each, entries 1–16 in the progress log):

1. Phase 1c storefront + review fixes.
2–6. (earlier sessions) builder phases 2a–2e.
7. Entry-6 review of 2d/2e → SHIP with fixes.
8. Phase 3 (CMS blocks, SEO, animations) + its review (entry 9).
9. Admin-GUI wiring audit (entry 10): power-rule fix, template basePrice hook, products↔builder Builder tab, nav link.
10. **Entry 11** — Phase 4 security review (5 fixes: Users privilege escalation, media SVG/staff write, configured-builds access, CSRF origin allowlist, error-message leaks) + 8 access tests (#45–52).
11. **Entry 12** — entry-11 review (SHIP), audit **35 → 0 vulns** (next 16.3.6 within payload peer window; esbuild override in `pnpm-workspace.yaml`), CI audit/secret-scan blocking, `docs/admin-training.md`.
12. **Entry 13** — entry-12 review (SHIP after fixes): real ESLint flat config (the `next lint` gate was dead under Next 16), **Stripe webhook handlers** (TDD #53–58; the adapter previously ACK'd events without settling anything), **webhook e2e 14/14** (signature reject, settle, replay-idempotency, refund, cleanup), **load test** (prod p50: 31 ms pages, 241/720 ms APIs; limiter holds: 400×29 + 429×31).
13. **Entry 14** — GitHub push (`ce6f133`), then the entry-10 deferrals + Phase-4 deltas (TDD #59–76): access-matrix tightening (11 collections via shared `isStaff`/`isManager` helpers, live-verified 403/401/200 matrix), builder-index 30 s cache + composite `rulesVersion` + invalidation hooks, rule-manager rewrite (inline edit, add/duplicate, CSV import preview-diff with Confirm/Cancel) incl. **export-name vs resolve-slug round-trip bug fix** (#74–76), Build Stats view + staff+ `/api/builder/stats`, legal footer, Plausible analytics events. Gates: 141/141, typecheck 0, lint 0, build 0. Pushed as `da30e30`.
14. **Entry 15** — auth + `/account` (TDD #77–88): `POST /api/auth/register` (zod, roles pinned to customer, 5/min/IP, origin check, 409 dup), `/auth/login` + `/auth/register` forms, `/account` (orders by owner **or** `customerEmail` + saved builds), `src/proxy.ts` account guard (Next 16; **`/checkout` deliberately unguarded** — guest checkout), header `AccountNav`, Save-to-account button, `POST /api/builder/builds/claim` (401/403/idempotent), `Users.ts` `maxLoginAttempts:5` + `roles` default `['customer']`. **Two live-probe bugs found + fixed** (#89–92): rule-engine dynamic mirror blocked every CPU+cooler save (asymmetric `coolerSocketSupport` vs missing spec — A8 skip added to both mirror paths) and use-template read the plural `component` shape → silently created empty price-0 builds (now accepts singular + 400s empty). Security review (1 Medium: XFF-first `clientIp` spoofable → proxy deployment contract documented) + code review SHIP. Gates: 157/157, typecheck 0, lint 0, build 0; full live probe suite (register/login/guard/claim) PASS. **Uncommitted.**
15. **Entry 16** — entry-15 review fixes (#93–94: builder store clears `buildId`/`shareId` on selection mutation, SummaryClient stale "Saved ✓"), **Playwright e2e suite** (`@playwright/test` 1.63 + `playwright.config.ts` + `e2e/{smoke,auth,builder}.spec.ts`, `pnpm test:e2e` **6/6** on the prod build; browsers were already in `%LOCALAPPDATA%\ms-playwright` — the old "no browser" assumption was wrong) — and it immediately found a **real bug: the site-wide Shop link 404'd** (`/shop/components` never existed as a category). Fixed with a new **`/shop` landing page** (ISR 1 h, category tiles + counts) + 6 refs retargeted + the seeded homepage CTA patched via admin REST (`pages-seed` skips existing slugs by design). New `apps/web/vitest.config.ts` scopes unit tests to `src/**` so vitest stops picking up the Playwright specs. Gates: **159/159**, typecheck 0, lint 0, build 0, e2e 6/6. **Uncommitted.**

Remaining Phase 4: Stripe **live** e2e (owner must supply `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` in `.env`), Lighthouse audit (chromium **is** present in `%LOCALAPPDATA%\ms-playwright` — the old "no browser" blocker is gone), Sentry DSN (owner), Postgres migrations dry-run (no Docker). Password reset (Resend adapter) deferred — no forgot-password link. Cart-drawer/dialog animations from Phase 3 remain deferred with their components.

## How we work (workflow)

- Review rounds use the **`code-review-checklist`** skill (answer Correctness/Security/Consistency/Tests, findings as `file:line`, verdict SHIP/FIX); payment/auth changes also trigger **`security-review`**; features/bugfixes are **TDD** (`test-driven-development` skill): RED → GREEN → docs.
- After changes always run the gate trio: `pnpm test`, `pnpm -r typecheck`, `pnpm lint` (+ `pnpm build` for anything build-relevant). Report results honestly, including failures.
- Full docs update every round: add a `18-progress-log.md` entry (reverse-chronological), refresh status tables in `00-index.md`, `15-delivery-phases.md`, the phase table at the bottom of the progress log, and correct any doc the work invalidated (e.g. `12-integrations-ops.md`, `08-api-surface.md` webhook sections were rewritten in entry 13).
- Web research (`websearch`/`webfetch`) for version/peer/advisory facts — never guess peers or CVE ranges.
- Stop only when genuinely blocked or unsure; otherwise continue through the plan.

## Gotchas (learned the hard way — do not rediscover)

- **PowerShell quoting**: never inline JSON/quotes in `curl --data` from PS. Write JSON to a file and use `curl.exe --data @file`; use `[System.IO.File]::WriteAllText` for exact unicode. `curl -o $null` still dumps the body to the PS stream — use a real temp file (`C:\Users\EDEMNUSHIW\AppData\Local\Temp\opencode\`). Take strings for `Edit` oldString from the `Read` tool (real unicode), not PS console output (mojibake `—`/`€`).
- **turbo strict env mode**: shell-injected env vars (`set STRIPE_KEY=…&& pnpm dev`) are *stripped* from `pnpm dev` tasks. Put keys in `.env` (child loads it) or `pnpm dev --env-mode=loose`. `pnpm start` from `apps/web` bypasses turbo and inherits env.
- **Stripe webhook**: route `POST /api/payments/stripe/webhooks` exists **only when `STRIPE_SECRET_KEY` is set** (404 is correct keyless). The `transactions` schema conditionally gains `paymentMethod` + `stripe` columns when an adapter exists — dev push self-heals on first key-ful boot; production must migrate *before* setting keys. Handlers live in `packages/plugin-shop/src/payments/stripe-webhooks.ts` (CAS-idempotent; deviate-from-plan event-id store intentionally).
- **CSRF**: cookie-authed requests need `Origin: http://localhost:3000` (allowlist: `BMR_URL` + localhost; `BMR_URL` must be set in prod). Note `BMR_URL` trailing slashes are normalized. This applies to **GETs too** — a REST GET with a session cookie and no Origin returns `200 {user:null}`/401 that looks like an auth failure (browsers are fine; curl/scripts must send the header).
- **New admin components** (`components.views`/`afterNavLinks`): run `pnpm payload -- generate:importmap` (dev server stopped) or the route 500s on the missing specifier.
- **pnpm 12** ignores `pnpm.overrides` in package.json → overrides live in `pnpm-workspace.yaml` (esbuild `0.18.20 → 0.25.12` must survive upgrades).
- **Next peer windows are narrow**: payload 3.90.2 wants `>=15.4.11 <15.5.0 || >=16.3.3 <17.0.0` — check `@payloadcms/next` peers before any next bump.
- **SQLite push races**: `push: true` is not idempotent under concurrent pushes (dev server + `payload run`) — never run both.
- **Dev server restarts**: kill all `node` before `pnpm build`, then relaunch dev via the background cmd pattern; keep `dev-server.log` fresh for diagnosis.
- Build must be re-run after any server/route change (prod serves `.next`; the webhook e2e required a fresh build + a key-ful server).
- SVG uploads are banned (stored-XSS); rate limits are in-memory single-instance (deviation from the Upstash plan, documented).
- **IP-keyed rate limits trust the leftmost `X-Forwarded-For`** — client-controlled when the origin is reached directly; production must sit behind a proxy that overwrites `X-Forwarded-For`/`X-Real-IP` (entry-15 security review VULN-01; contract in `11-access-security.md`). Login brute-force is separately protected by payload `maxLoginAttempts: 5`.
- **build-templates store a SINGULAR `component` per slot; configured-builds use `components[]`** — mixing the two shapes silently produced empty price-0 builds (entry-15 bug #91/92; the endpoint now accepts both and 400s empty).
- **Playwright browsers are preinstalled** in `%LOCALAPPDATA%\ms-playwright` (chromium etc.) — do not reinstall or assume "no browser". `pnpm test:e2e` needs a fresh `pnpm build` + running `next start` (the config reuses an existing :3000 server); the register spec performs exactly **one** registration per run (5/min/IP limiter).
- **`vitest run` in apps/web picks up `e2e/*.spec.ts`** (Playwright files) without `apps/web/vitest.config.ts`, which scopes unit tests to `src/**` — keep that config when adding tests.
- **`seed-pages` is idempotent-by-slug and skips existing pages** — editing seeded homepage content in code won't update an existing dev DB (entry 16 patched the home CTA via admin REST `PATCH /api/pages/1`); only a fresh DB picks the new seed text.

## Key file map

- Payment path: `packages/plugin-shop/src/index.ts` (adapter wiring) → `src/payments/stripe-webhooks.ts` (+ `.test.ts`, #53–58) → adapter internals at `packages/plugin-shop/node_modules/@payloadcms/plugin-ecommerce/dist/payments/adapters/stripe/`.
- Auth/account: `apps/web/src/lib/auth.ts` (registerUser, `clientIp`, `sanitizeNext`, `accountGuard` — tests `src/lib/auth.test.ts` #77–84/88), `src/app/api/auth/register/route.ts`, `src/app/auth/{login,register}/`, `src/app/account/`, `src/proxy.ts` (Next 16 middleware), `src/components/AccountNav.tsx`, claim endpoint `builderClaimBuildEndpoint` in `packages/plugin-pc-builder/src/endpoints.ts` (#85–86), orders read override in `packages/plugin-shop/src/index.ts`.
- Rule engine: `packages/lib/src/rule-engine.ts` (+ `.test.ts` #89–90 A8 mirror skip) — bidirectional mirror **skips when either side lacks the mirrored field**; template use endpoint (`builderUseTemplateEndpoint`) reads singular `component` slots (#91–92).
- Access control: `apps/web/src/collections/Users.ts`, `packages/plugin-shop/collections/media.ts`, `packages/plugin-pc-builder/src/collections/configured-builds.ts`, CSRF in `apps/web/src/payload.config.ts`; entry-14 matrix helpers `packages/{plugin-pc-builder,plugin-shop}/src/lib/access.ts` (`isStaff`/`isManager`, tests `collections/access-matrix.test.ts`).
- Builder ops: `packages/plugin-pc-builder/src/lib/builder-index.ts` (cached index + `rulesVersion`), `src/lib/rule-import.ts` + `src/endpoints.ts` (dryRun import), admin views `src/admin/{RuleManagerView,BuildStatsView}.tsx`, stats `src/lib/build-stats.ts`.
- Analytics: `apps/web/src/lib/analytics.ts` (Plausible `track()`, gated on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`).
- E2e/shop: `apps/web/playwright.config.ts` + `apps/web/e2e/{smoke,auth,builder}.spec.ts` (#95–100, `pnpm test:e2e`); `/shop` landing `apps/web/src/app/shop/page.tsx` (entry-16 dead-link fix; the 6 retargeted refs: layout header, sitemap, account, `_HomeFallback`, `pages-seed`, category-page breadcrumb).
- CI: `.github/workflows/ci.yml` (lint, typecheck, test, build, audit, secret-scan — all blocking).
- Load test: `scripts/load-test.mjs`.
- Plan docs: `docs/buildmyrig-plan/` (`00-index.md` status → `18-progress-log.md` history → `15-delivery-phases.md` DoDs → topic docs 01–16).

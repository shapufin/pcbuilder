# AGENTS.md — BuildMyRig handoff / workflow context

Read this first in a new AI session. It is the recovery point for the whole project: state, commands, conventions, gotchas, and where the detailed docs live. Nothing here is committed yet — **all work since `5284cbc`/`eeeb067` (Phases 2d/2e) lives in the working tree; do NOT commit unless the user explicitly asks.**

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
| `pnpm dev` | dev server (turbo → Next dev, port 3000). Background pattern: `Start-Process cmd /c "cd /d <repo> && (pnpm dev) > dev-server.log 2>&1"` |
| `pnpm build` | production build (kill stale `node` processes first) |
| `pnpm start` | prod server — run from `apps/web` (bypasses turbo) |
| `pnpm test` / `pnpm -r test` | Vitest — current: **123/123** (lib 65, plugin-shop 19, plugin-pc-builder 35, web 4) |
| `pnpm -r typecheck` | tsc --noEmit (expect 0) |
| `pnpm lint` | turbo lint — `apps/web` uses real ESLint flat config (`eslint .`), expect 0 problems |
| `pnpm seed` | reseed dev DB (31 components, 42 rules, 34 products, 2 templates) |
| `pnpm loadtest` | `scripts/load-test.mjs` — local load test (needs a running server; use prod build for real numbers) |
| `pnpm payload -- <cmd>` | Payload CLI in apps/web (e.g. `generate:types`) |

Test numbering convention: tests are numbered cumulatively across entries (#1–#58 so far) and referenced in the progress log.

Credentials: `admin@buildmyrig.test` / `Password123!` (id1 admin, id2 manager, id3 staff `staff@buildmyrig.test`).

## Current phase status (2026-09-28)

Phases 0, 1 (minus live Stripe e2e), 2a–2e, 3 **done**; **Phase 4 (hardening) in progress**. Everything reviewed each round with the `code-review-checklist` skill; entry-level detail in `docs/buildmyrig-plan/18-progress-log.md` (reverse-chronological).

Session history (one line each, entries 1–13 in the progress log):

1. Phase 1c storefront + review fixes.
2–6. (earlier sessions) builder phases 2a–2e.
7. Entry-6 review of 2d/2e → SHIP with fixes.
8. Phase 3 (CMS blocks, SEO, animations) + its review (entry 9).
9. Admin-GUI wiring audit (entry 10): power-rule fix, template basePrice hook, products↔builder Builder tab, nav link.
10. **Entry 11** — Phase 4 security review (5 fixes: Users privilege escalation, media SVG/staff write, configured-builds access, CSRF origin allowlist, error-message leaks) + 8 access tests (#45–52).
11. **Entry 12** — entry-11 review (SHIP), audit **35 → 0 vulns** (next 16.3.6 within payload peer window; esbuild override in `pnpm-workspace.yaml`), CI audit/secret-scan blocking, `docs/admin-training.md`.
12. **Entry 13** — entry-12 review (SHIP after fixes): real ESLint flat config (the `next lint` gate was dead under Next 16), **Stripe webhook handlers** (TDD #53–58; the adapter previously ACK'd events without settling anything), **webhook e2e 14/14** (signature reject, settle, replay-idempotency, refund, cleanup), **load test** (prod p50: 31 ms pages, 241/720 ms APIs; limiter holds: 400×29 + 429×31).

Remaining Phase 4: Stripe **live** e2e (owner must supply `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` in `.env`), Playwright/Lighthouse gates (no browser on this machine), Sentry DSN (owner), admin-GUI deltas (rule-manager inline edit/export/CSV preview-diff, Build Stats view, `rulesVersion`/cache-invalidation), legal pages, migrations dry-run.

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
- **CSRF**: cookie-authed requests need `Origin: http://localhost:3000` (allowlist: `BMR_URL` + localhost; `BMR_URL` must be set in prod). Note `BMR_URL` trailing slashes are normalized.
- **pnpm 12** ignores `pnpm.overrides` in package.json → overrides live in `pnpm-workspace.yaml` (esbuild `0.18.20 → 0.25.12` must survive upgrades).
- **Next peer windows are narrow**: payload 3.90.2 wants `>=15.4.11 <15.5.0 || >=16.3.3 <17.0.0` — check `@payloadcms/next` peers before any next bump.
- **SQLite push races**: `push: true` is not idempotent under concurrent pushes (dev server + `payload run`) — never run both.
- **Dev server restarts**: kill all `node` before `pnpm build`, then relaunch dev via the background cmd pattern; keep `dev-server.log` fresh for diagnosis.
- Build must be re-run after any server/route change (prod serves `.next`; the webhook e2e required a fresh build + a key-ful server).
- SVG uploads are banned (stored-XSS); rate limits are in-memory single-instance (deviation from the Upstash plan, documented).

## Key file map

- Payment path: `packages/plugin-shop/src/index.ts` (adapter wiring) → `src/payments/stripe-webhooks.ts` (+ `.test.ts`, #53–58) → adapter internals at `packages/plugin-shop/node_modules/@payloadcms/plugin-ecommerce/dist/payments/adapters/stripe/`.
- Access control: `apps/web/src/collections/Users.ts`, `packages/plugin-shop/collections/media.ts`, `packages/plugin-pc-builder/src/collections/configured-builds.ts`, CSRF in `apps/web/src/payload.config.ts`.
- CI: `.github/workflows/ci.yml` (lint, typecheck, test, build, audit, secret-scan — all blocking).
- Load test: `scripts/load-test.mjs`.
- Plan docs: `docs/buildmyrig-plan/` (`00-index.md` status → `18-progress-log.md` history → `15-delivery-phases.md` DoDs → topic docs 01–16).

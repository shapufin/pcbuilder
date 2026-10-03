# AGENTS.md — BuildMyRig

Read this first in a new AI session. This is the slim always-on router —
deep knowledge lives in `.devin/context/` (per-domain), `PROJECT_INDEX.md`
(file map), and `docs/buildmyrig-plan/` (full spec + progress log).
**Do NOT commit/push unless the user explicitly asks.**

## What this is

Monorepo (pnpm 12 + Turborepo) for **BuildMyRig** — a custom-PC
storefront: Payload CMS 3.90.2 + Next.js **16.3.8** + React 19,
TypeScript, plain CSS + design tokens (`packages/ui/tokens.css` — **no
Tailwind**). **Dev-first: local SQLite (`push: true`), building/testing
locally — no production deploy yet** (Postgres/Vercel are plan-level).
Path A: `@payloadcms/plugin-ecommerce` for shop/payments.

- `apps/web` — storefront, `/builder` configurator, `/admin` Payload, REST endpoints.
- `packages/lib` — rule engine, rate limiter, line-item utils (heavily TDD'd).
- `packages/plugin-shop` — ecommerce wiring: collection overrides, Stripe adapter, webhook handlers.
- `packages/plugin-pc-builder` — builder collections/endpoints/admin views.
- `packages/plugin-pages` — pages, site-settings + theme globals, block system v2.
- `packages/ui` — `tokens.css` design tokens.
- `docs/buildmyrig-plan/` — full technical plan (`00-index.md`); `docs/admin-training.md` — admin handbook.

## Commands

Gate trio after every change: `pnpm test` + `pnpm -r typecheck` +
`pnpm lint` (+ `pnpm build` for build-relevant, `pnpm test:e2e` for
route/UI work, `pnpm audit --prod --audit-level high` for deps).
`pnpm workflow:check` validates this workflow's files.
Full table + constraints (turbo env allowlists, dev-boot schema push,
prod-server env): `.devin/context/05-devops-gates.md`.

Credentials: `admin@buildmyrig.test` / `Password123!` (id1 admin, id2
manager, id3 staff `staff@buildmyrig.test`).

## Task router — read the `.devin/context/` file BEFORE editing

| Task touches | Read |
| --- | --- |
| payment, order, webhook, cart, checkout, email, inventory | `.devin/context/01-commerce.md` |
| rule, compatibility, component, template, configured-build | `.devin/context/02-builder.md` |
| role, access, CSRF, rate limit, auth, upload | `.devin/context/03-security-access.md` |
| page, block, lexical, theme, token, site-settings, SEO | `.devin/context/04-cms-pages-theme.md` |
| build, test, CI, env, dependency, upgrade, schema push | `.devin/context/05-devops-gates.md` |
| debugging odd PowerShell/payload/zustand/playwright behavior | `.devin/context/06-gotchas.md` |
| deep spec detail | `docs/buildmyrig-plan/<topic>.md` via `00-index.md` |

## Tool router — highest accuracy per token

- Code nav/usages/impact → **trace-mcp** (`search`, `find_usages`,
  `get_change_impact`, `batch`) — never grep for symbols.
- Library/framework API truth → **context7** — never trust memory on
  fast-moving APIs (Next 16, Payload 3.x).
- Versions/peers/CVEs → **web_search** — never guess advisory ranges.
- Independent multi-file investigation → `subagent_explore` (read-only).
- Review rounds → `code-review-checklist` (+ `security-review` for
  auth/payments); dispatch per `.devin/rules/agents.md`.
- Multi-step design reasoning → sequential-thinking.

## Critical guardrails

- Plugin boundary: no cross-plugin or plugin→`apps/web` imports (lint-enforced).
- No raw hex in `apps/web/src/**` — `var(--*)` tokens only (lint-enforced).
- Server recomputes price at checkout — never trust client totals.
- SQLite schema push runs ONLY on a `pnpm dev` boot; new env vars need
  `turbo.json` `env` allowlists; overrides live in `pnpm-workspace.yaml`
  (esbuild + undici pins must survive).
- Keep `apps/web/vitest.config.ts` (`src/**` scope + `@` alias) and the
  `apps/web/AGENTS.md` Next-managed block untouched.

## How we work (workflow + update contract)

- TDD (`test-driven-development` skill): RED → GREEN → verify gates.
- Review each round with `code-review-checklist` (SHIP/FIX + `file:line`
  findings); auth/payment changes also get `security-review`.
- Per round: `18-progress-log.md` entry + status tables
  (`00-index.md`, `15-delivery-phases.md`); fix any `.devin/context/`
  file the work invalidated; append a session-log one-liner below;
  `pnpm workflow:check`. Budget overflow → split/archive, never raise.
- **Currency**: prefer latest stable deps; upgrade early inside peer
  windows; majors need user sign-off.
- **Auto-tracking**: lifecycle hooks append every file edit to
  `.devin/tracking/edits-<session>.jsonl` and sessions to
  `sessions.jsonl` (gitignored JSONL). Hook-less tools follow the
  contract manually; the ledger answers "what changed" on resume.

## Current status (2026-10-03)

Phases 0–3, 5 done; Phase 4 nearly done; CI all-8-gates green
(36898140224); `main` pushed through entry 24 (`29ed1b5`). **Entries
25–44 are uncommitted.** **The gap register is fully resolved** — all
7 blocking items fixed (entries 30–32), every minor either fixed
(entries 33–44: analytics funnel, C1 checkout address+country tax, C4
reservations at scale, C5 wishlist staleness, C6 seed fidelity, C7 index
measured, C8 derived-power singleton, C9 doc drift, C10 deployment
checklist, raw-inventory masking, entry-44 review round) or a declared
decision (transactions/addresses staff-read aligned to spec; stock-write
manager+, customers→users, redirects, Shipments declared) or a
prod-keyed deferral (claim CAS, XFF — in the deployment checklist).
**Entry 44**: 3-reviewer code-review pass → webhook settlement hardened
(stale-claim resume, orphan-order reuse, resumable decrement, snapshot
discount counting, `charge.succeeded`), checkout 3DS-return + €0
degrade + retry, shareId-update fix — **383 unit + 11 e2e green**.
**Only Round A (commit split)
and Round B (owner-keyed: Stripe e2e, Resend, Postgres migrate, Sentry,
Plausible) remain.** Detail: `docs/buildmyrig-plan/18-progress-log.md`;
plan: `.devin/plans/plan-bmr-next-rounds.md`.

## Session log

Last 1–2 dates stay here; older entries live in
`.devin/tracking/agents-archive-2026-10.md` (entries 1–24 + rotated
25–42 verbatim).
Tests numbered cumulatively (#1–#285 + e2e; per-package counts in 05).

39. **Entry 44** — **3-reviewer code review → all FIX, all fixed**: pushed back the one false claim (drizzle `updateOne` `atomic:true` IS single-statement — verified in dist); shareId no longer rotates on update (#274–275); webhook settlement hardened — stale `processing` (>60 s) re-claimable, lost-claim bounded re-check runs post-steps, errors rethrow for Stripe retry, orphan-order reuse, `inventoryProgress`/`inventoryComplete` resumable decrement, `charge.succeeded` handled (#276–282); tx `discountCodeApplied`+`totalsSnapshot` snapshot + `maxUses` at increment (#283–284); checkout 3DS-return confirm, empty-cart + €0 degrade, single-method auto-select, confirm-retry button; cart totals access-locked, invalid-discount clear via `validateDiscount`, zero-qty lines dropped, case-insensitive country tax, `superseded` reservations, collection-aware access helpers, Retry-After on 429s, page/price clamp (#285), sitemap `?template=` dropped. **383 unit + 11 e2e**; lesson: e2e needs a dev-boot schema push first + `pnpm start` (prod), not dev.

38. **Entry 43** — **all decisions resolved**: transactions → staff+ read / admin-only write (`transactionsAccess`); addresses → staff-or-own read (`staffOrOwnAddressRead`) — both spec-aligned, live-probed (#272–273). Declared: `Shipments` + `redirects` out of scope, stock-write manager+, customers→users collapse — matrix + register updated. **Register has zero unresolved rows**; only Round A (commits) + Round B (owner keys) remain. 371 tests, all gates green.

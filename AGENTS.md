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

## Current status (2026-10-04)

Phases 0–3, 5 done; Phase 4 nearly done; CI all-8-gates green
(37194748589). **Entries 25–45 committed + pushed to `origin/main`**
(`135b463`). **RIG Studio megaplan (entries 45–54) pushed** at `9b6efa6`;
**entries 55–57 pushed** at `0565804` (`1a3ed2f..0565804`: review-fix
round 2, Lighthouse re-run, €0 confirm-free + SEC-001 re-check).
**Entry 56: Lighthouse re-run done** (Round D) — first
post-redesign audit; a11y 100 everywhere, home perf 82–91 band is a
watch item. **Entry 47: "Precision Dark" frontend redesign committed**
in 6 domain commits (`ac3e6e1`..`a153f2b`) **+ pushed, CI green** (`37127009398`) — tokens v2 + primitives/shell/product-card/shop/
product/cart/checkout/auth/blocks CSS; all 14 blocks + builder retokenized;
`style={{` 269→20; uisight mobile+desktop clean (15 findings → 0);
107 web unit + e2e 11/11. Plan: `~/.devin/plans/plan-e7bb003c0cf36a76.md`.
**The gap register is fully resolved** — all
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
degrade + retry, shareId-update fix — **384 unit + 11 e2e green**.
**Round B stays owner-keyed** (Stripe e2e, Resend, Postgres migrate,
Sentry, Plausible); **Round D complete** (mobile `FilterDrawer`, entry
59) + **entry 60: visitor theme toggle** (`#theme-alt` swap + header
`ThemeToggle`, `bmr_theme` persisted) + **entry 61: nested-`specsJson`
spec-table fix** (audit S3) + **entry 62: PDP RelatedProducts** +
**entry 63: review fixes** + **entry 64: spec facets, PDP compatibility,
critical-path pass** — **audit S2/S3 fully closed, no unblocked backlog
left**; entries 55–63 pushed at `d5fc10b`, flake fix `596aa7a` — **CI
all-8 green (37208259966)**. Detail:
`docs/buildmyrig-plan/18-progress-log.md`;
plan: `.devin/plans/plan-bmr-next-rounds.md`.

## Session log

Last 1–2 dates stay here; older entries live in
`.devin/tracking/agents-archive-2026-10.md` (entries 1–24 + rotated
25–51 verbatim).
Tests numbered cumulatively (#1–#428 + e2e; per-package counts in 05).

59. **Entry 64** — **last unblocked backlog, all closed**: **spec facets +
   per-facet counts** (`lib/facets.ts`; `?socket=AM5`; counts from the
   non-facet set; audit S2) + **PDP compatibility list** (`compatRows()`;
   audit S3) + attribute display names + `scripts/backfill-attributes.mjs`
   (21 products repaired — dev DB predated the field) + **critical-path
   pass**: framer-motion ~57 KB chunk off `/shop`+PDP (CSS badge pop, lazy
   drawer, click-time fly-to-cart) and `scripts/perf-probe.mjs` (real LCP
   1.46 s vs Lighthouse lantern 3.7 s). 547 unit, typecheck 6/6, lint 4/4,
   build 25/25, **19/19 e2e**. SHIP.
58. **Entry 63** — **review-fix round on 59–62** (both review findings
   closed): `FilterDrawer` panel id → `useId` (trigger `aria-controls`
   matches the panel; #415 pins two drawers → distinct ids; e2e selects
   by role) + `suppressHydrationWarning` on the three theme style tags
   (boot script rewrites `media` pre-hydration; **dev-mode verified: 0
   console messages** — gotcha #40) + stale generated types synced
   (`paymentProvider`, entry-57 drift). 532 unit, typecheck 6/6, lint
   4/4, build 25/25, 16/16 e2e. SHIP.
57. **Entry 62** — **PDP RelatedProducts rail** (audit S3 nearly done):
   ≤4 same-category published products via `ProductCardGrid`, self
   excluded, hidden when none. Two stale S3 "gaps" (gallery, variant
   picker) re-marked done — both landed entry 47. e2e-only round:
   `related-products.spec.ts` → **16/16 e2e**, build 25/25. SHIP.
56. **Entry 61** — **PDP spec-table nested `specsJson`** (audit S3):
   `String(v)` → `[object Object]`; new pure `lib/specs.ts` `specRows()`
   dot-flattens objects, joins arrays, `—` for null. TDD #409–#414 →
   531 unit; live REST probe rendered nested rows, restored. SHIP.
43–55. **Entries 47–60** — Precision Dark redesign, theme-swap registry,
   megaplan P0–P4 + review-fix round (rig-dark default, design registry,
   rig-studio UI, `NEXT_BUILD_CPUS`), Lighthouse re-run, €0 confirm-free +
   settlement-core + SEC-001, CI build-flake fix, mobile FilterDrawer
   (Round D done), visitor theme toggle. Full text in
   `.devin/tracking/agents-archive-2026-10.md`.

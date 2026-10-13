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

## AI entry points

`AGENTS.md` is the single source of truth (`CLAUDE.md` overlays it). Pointers:
`.github/copilot-instructions.md`, `GEMINI.md`, `CONVENTIONS.md` (Aider),
`.cursor/rules/buildmyrig.mdc`, `.windsurf/rules/buildmyrig.md`; OpenCode and
Codex read `AGENTS.md` natively. `workflow:check` fails if a pointer drifts.

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

## Current status (2026-10-10)

Phases 0–3, 5 done; Phase 4 hardening complete; CI all-8-gates green.
"Precision Dark" frontend redesign committed + pushed. The gap register is
fully resolved (all 7 blocking items fixed; all minor items closed or declared).
Recent rounds: entries 88–91 (perf ISR, admin hydration, GUI design spec,
primitive library), entries 92–110 = Admin GUI Modernization Program
(dashboard, nav, command palette, plugins manager, collection list headers,
rule matrix, build stats — entries 107–109; global edit-view headers for
`site-settings`/`builder-settings` via `elements.Description` — entry 110).
Detail: `docs/buildmyrig-plan/18-progress-log.md`.

## Session log

Last 1–2 dates stay here; older entries live in
`.devin/tracking/agents-archive-2026-10.md` (entries 1–24 + rotated
25–51 verbatim).
Tests numbered cumulatively (#1–#647 + e2e; per-package counts in 05).

16. **Entry 123** — **Claim CAS Hardening (VERIFY-001 Closed)**:
    `POST /api/builder/builds/claim` upgraded to atomic CAS `update` with
    `where: { and: [{ id }, { or: [{ user: exists false }, { user: null }] }] }`.
    Race re-check guarantees safe 403 on foreign claim or 200 idempotent for own.
    Test #86b added. Lib 86 / shop 163 / pc-builder 118 / web 422 green, tc+lint 0.
15. **Entry 122** — **Admin GUI & Backend Audit**: Full 60-route crawl
    (all 6 custom views, 4 globals, 20 collections across list/create/edit)
    via `admin-crawl.spec.ts` (added `/admin/design-system` custom view);
    new `admin-workflows.spec.ts` testing 5 interactive browser workflows
    (Rule Sandbox, Product SERP sync, Attribute Terms, Theme toggle, Facets).
    0 route errors (HTTP/page/console); unit 422 web, tc+lint 0, e2e clean.
12. **Entry 120** — **Money-format unification**: `formatEUR(cents|null)`
   promoted to `packages/lib` (`money.ts`, Intl en-IE, null-safe); `Price.tsx`
   re-exports it, `templates.ts` re-exports as `formatEur`, 3 admin headers'
   inline copies replaced — five impls → one. Backlog item 1 closed.
   #645–#647; lib 83 / plugin-shop 166 / web 422 unit green, tc+lint 0.
13. **Entry 119** — **Graphify rebuild + architecture audit**: 3 546 nodes /
    7 778 edges / 215 communities on 639 files; package bridges verified
    (`BuilderIndex` shared spine, `pagesPlugin`→config, `shopPlugin`→checkout
    Path A). Two refactor findings → `17-assumptions-backlog.md`: unify
    `formatEUR`/`formatEur` in `packages/lib`; relocate `sendResendEmail` out of
    plugin-shop. `getPayloadClient()` flagged 61-edge chokepoint.
14. **Entry 121** — **Mailer relocation**: `sendResendEmail` →
    `packages/lib/src/mail.ts` behind new `@buildmyrig/lib/server`
    subpath (`.` entry stays browser-pure); `emails/resend.ts` = re-export;
    3 web routes (forgot-password, contact, newsletter) decoupled from
    plugin-shop. `01-commerce.md` updated. Tests moved (#118–#120 names
    kept); lib 86 / shop 163 / web 422, tc+lint 0.
99–110. **Entries 107–118** — Mockup parity slide-over creates, Design System
   view, review fixes, crawl fixes, list-table cells + registry headers,
   global views + collection headers, admin audit fix round, e2e crawl green.
   Verbatim in archive (rotated 2026-10-12/-13).
43–98. **Entries 47–106** — Precision Dark redesign, admin overlays, command palette, modern commerce overhaul, performance ISR, design spec, primitive library, and list elevations. Verbatim in archive.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

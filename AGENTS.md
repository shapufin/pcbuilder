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
(37117923390). **Entries 25–45 committed + pushed to `origin/main`**
(`135b463`). **Entry 47: "Precision Dark" frontend redesign committed**
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
**Only Round B (owner-keyed: Stripe e2e, Resend, Postgres migrate,
Sentry, Plausible) + push remain.** Detail: `docs/buildmyrig-plan/18-progress-log.md`;
plan: `.devin/plans/plan-bmr-next-rounds.md`.

## Session log

Last 1–2 dates stay here; older entries live in
`.devin/tracking/agents-archive-2026-10.md` (entries 1–24 + rotated
25–45 verbatim).
Tests numbered cumulatively (#1–#365 + e2e; per-package counts in 05).

49. **Entry 54 P4** — **megaplan complete**: DeployModal real 4-stage
   pipeline (validate → power → save → cart; halts on errors),
   SavedBuildsModal 3-tab (authed/guest refs, presets, export/import);
   seed §7 (specsJson/hasRgb/slot caps, ram+storage max→4); **default
   flip → `rig-studio`** (#363–364). #353–#365 → 480 unit, trio + build
   + 12/12 e2e (deploy verified live). Review FIX → all 9 fixed.

48. **Entry 53 P3** — **`rig-studio` full UI shipped** (RIG_model1 port,
   real `useBuilder()` data only): header/bay/swap-modal + blueprint SVG
   (8 zones, spec labels, ghost sockets) + toolbar/pills/telemetry/price
   cards + matrix view; `studio-lib` pure layer #332–352; `rig-studio.css`
   fully `.bdesign-rig-studio`-scoped; lucide-react 1.47.0. Review
   FIX→fixed (CSS scoping + bay→zone hover).

47. **Entry 52 P2** — **builder-design brain landed**: `BuilderProvider`
   owns index/engine/`resolveSlotLimits`/hydration/loading-error; designs =
   `useBuilder()` consumers (`state`/`actions`/`meta`+`actionStatus`).
   `designs.ts` registry + `BuilderShell` + `getBuilderDesign()` wire the
   admin pick (rig-studio code-split stub, parity #331). Store += cosmetic
   `rgbColor` (#93-exempt) + `applyTemplate` reset; `kit/` =
   `useBuildActions`/`option-rows`/`build-io`/`BuilderToasts`. Classic now
   shows resolved caps live. Review FIX → fixed. #320–331 → 446 unit, gates
   + build + uisight green.

46. **Entry 51 P1** — **`rig-dark` is the site default**: tokens.css
   statics retokenized to the RIG palette (first paint + no-JS = rig-dark;
   `dark`/`light`/`midnight` stay swappable presets — stored docs keep
   theirs until re-selected); `THEME_PRESETS` +`'rig-dark'`
   (`#288` keys, `skin:'rig-dark.css'` — scrollbars/`::selection`/cyan
   glow); `next/font/google` Inter→`--font-inter` + Space_Grotesk→
   `--font-space-grotesk` on `<html>` (`--font-sans`/`--font-display`
   wrap them, `--font-mono` stays true mono; fetches at build/dev — CI
   needs network); `DEFAULT_FONTS` lead with `var(--font-*)` (code-side,
   bypasses `validateFont`); `viewport.themeColor` hsl literal (no-hex).
   Live swap probe green; build green. TDD `#318–#319` → 432 unit.

45. **Entry 50 P0** — **RIG Studio schema+registry** (megaplan
   `plan-ec05526c8dbc0fdc.md`): `resolveSlotLimits`+`SLOT_LIMIT_RULES`
   (mobo `ramSlots`/`m2Slots` caps, client-enforced → server
   `findOverCapWarnings` into `validationSnapshot`); `rgb-presets.ts`
   (hex home — apps/web bans literals); `BUILDER_DESIGNS` registry +
   plugin-owned `builder-settings` global (never-throw resolver, own-prop)
   + `getBuilderDesign()`; `components.{hasRgb,ramSlots,m2Slots}` +
   `configured-builds.rgbColor` (schema+endpoint+share passthrough).
   Live-verified index+global. TDD `#294–#311` → 424 unit, trio green.

44. **Entry 49** — **admin-GUI design swap (Tier 1+2)**: `THEME_PRESETS`
   registry (dark/light/midnight) drives the Theme select (`#288` parity +
   extras-key parity); `Theme.extras` = preset-tuned scrim/glow/soft vars
   (`#289`, `#292` drift guard, `#293` hostile-preset hasOwn); `packages/ui/
   skins/*.css` overlays inject via `#theme-skin` (cached `loadSkin` +
   single-fetch `getThemeAssets`); live-verified admin POST swap both
   directions; post-impl review FIX → all fixed. TDD `#288–#293` → 406
   unit, typecheck 6/6, lint 4/4.

43. **Entries 47–48** — Precision Dark redesign + 3-reviewer round (30+
   fixes). Full text in `.devin/tracking/agents-archive-2026-10.md`.

---
description: "BuildMyRig task router, tool router, and critical guardrails"
trigger: always_on
---

# BuildMyRig — router

Dev-first custom-PC storefront. pnpm 12 + Turborepo: `apps/web`
(Next 16.3.8 + Payload 3.90.2 + React 19, local SQLite `push:true`) +
`packages/{lib, ui, plugin-pages, plugin-pc-builder, plugin-shop}`.
Full state: `AGENTS.md`. Deep docs: `docs/buildmyrig-plan/00-index.md`.

## Task router — read the matching `.devin/context/` file BEFORE editing

- payment, order, webhook, cart, checkout, email, resend, inventory → `01-commerce.md`
- rule, compatibility, component, template, configured-build, socket → `02-builder.md`
- role, access, CSRF, origin, rate limit, XFF, upload, auth → `03-security-access.md`
- page, block, section, lexical, theme, token, site-settings, seo → `04-cms-pages-theme.md`
- build, test, lint, CI, env, turbo, dependency, upgrade, schema push → `05-devops-gates.md`
- PowerShell/probe/zustand/vitest/playwright/payload-REST weirdness → `06-gotchas.md`
- Deep spec detail → `docs/buildmyrig-plan/<topic>.md`; map: `PROJECT_INDEX.md`

## Tool router — highest accuracy per token

- Code nav/usages/impact → trace-mcp (`search`, `find_usages`,
  `get_change_impact`, `batch`) — never grep for symbols
- Library/framework API truth (Next 16, Payload, zod…) → context7 —
  never trust memory on fast-moving APIs
- Versions/peers/CVEs → web_search — never guess advisory ranges
- Independent multi-file investigation → `subagent_explore` (read-only)
- Review rounds → `code-review-checklist` (+`security-review` for
  auth/payments) — dispatch per `.devin/rules/agents.md`
- Multi-step design reasoning → sequential-thinking

## AI entry points (every tool lands on the same rules)

`AGENTS.md` is the single source of truth; `CLAUDE.md` is its thin overlay.
Natively reading AGENTS.md: **Claude Code/Desktop**, **OpenCode**, **Codex**,
**Cursor** (also `.cursor/rules/buildmyrig.mdc`), **Windsurf** (also
`.windsurf/rules/buildmyrig.md`). Pointers added in entry 65:
`.github/copilot-instructions.md` (Copilot), `GEMINI.md` (Gemini CLI),
`CONVENTIONS.md` (Aider). `pnpm workflow:check` fails if a pointer stops
referencing AGENTS.md/`.devin/context/` or grows past 4 000 chars — keep them
thin, never a second copy of the rules.

## Critical guardrails

- Never commit/push unless the user explicitly asks.
- TDD (`test-driven-development` skill): RED → GREEN. Then gate trio:
  `pnpm test`, `pnpm -r typecheck`, `pnpm lint` (+ `pnpm build` /
  `pnpm test:e2e` when relevant). Report results honestly.
- Plugin boundary: no cross-plugin or plugin→`apps/web` imports —
  lint-enforced.
- No raw hex in `apps/web/src/**` — use `var(--*)` tokens (lint-enforced).
- Server recomputes price at checkout — never trust client totals.
- SQLite schema push happens ONLY on a `pnpm dev` boot; new env vars
  need `turbo.json` `env` allowlists; overrides live in
  `pnpm-workspace.yaml`.
- Prefer latest stable deps; upgrade early inside peer windows; verify
  peers/advisories via web research; majors need user sign-off.

## Update contract (keeps this workflow alive)

Every work round: progress-log entry + status tables; fix any context
file the work invalidated; AGENTS.md session-log one-liner (rotate at
>2 dates); `pnpm workflow:check`; over-budget file → split/archive,
never raise the limit.

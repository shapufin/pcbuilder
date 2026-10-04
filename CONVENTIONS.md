# BuildMyRig — AI instructions (pointer)

Aider reads this file automatically. **Single source of truth:
[`AGENTS.md`](AGENTS.md)** at the repo root — read it first, it is the router.
Domain detail lives in `.devin/context/` (index: `00-INDEX.md`); the full spec in
`docs/buildmyrig-plan/00-index.md`.

Monorepo: `apps/web` (Next 16 + Payload 3) + `packages/{lib,ui,plugin-pages,plugin-pc-builder,plugin-shop}`.

Non-negotiables:

- Never commit or push unless the user explicitly asks.
- TDD (RED → GREEN), then the gates: `pnpm test`, `pnpm -r typecheck`, `pnpm lint`
  (+ `pnpm build` for build-relevant work, `pnpm test:e2e` for route/UI work).
- Plugin boundary: no cross-plugin or plugin→`apps/web` imports (lint-enforced).
- No raw hex in `apps/web/src/**` — use `var(--*)` design tokens (lint-enforced).
- Server recomputes price at checkout — never trust client totals.
- Read the matching `.devin/context/` file before editing that domain.

# 05 — DevOps: commands, gates, env, dependencies

Canonical doc: `docs/buildmyrig-plan/12-integrations-ops.md`.
Dev-first: local SQLite (`push: true`), no production deploy yet —
Postgres/Vercel are plan-level, not operational facts.

## Commands (repo root)

| Command | What / constraints |
| --- | --- |
| `pnpm dev` | turbo → `next dev` :3000. Background: `Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','cd /d <repo> && (pnpm dev) > dev-server.log 2>&1'` |
| `pnpm build` | kill stale `node` first; rerun after any server/route change |
| `pnpm start` | from `apps/web` — bypasses turbo, does NOT load root `.env` |
| `pnpm test` / `pnpm test:e2e` | Vitest (turbo) / Playwright (from `apps/web`, needs `next start` on :3000) |
| `pnpm -r typecheck` / `pnpm lint` | tsc --noEmit / 4 eslint tasks (incl. hex rule + plugin boundaries) |
| `pnpm seed` / `pnpm payload -- <cmd>` | reseed dev DB / Payload CLI (`generate:types`, `generate:importmap`) |
| `pnpm loadtest` / `pnpm workflow:check` | load test (needs running server) / workflow validator |
| `npx lighthouse@12 <url>` | audit vs prod `next start` :3000; gate perf ≥90 (±5 throttle variance — rerun), a11y/BP/SEO 100. `/checkout` BP/SEO dip is expected (Stripe 3p cookie + deliberate robots disallow — entry 56) |

Gate trio after every change: `pnpm test` + `pnpm -r typecheck` +
`pnpm lint` (+ `pnpm build` for build-relevant work; + `test:e2e` for
route/UI changes). CI mirrors this as 8 blocking gates: install →
secret-scan → lint → typecheck → test → Postgres schema-push dev boot →
build → `pnpm audit --prod --audit-level high`. Advisory handling:
unpatched GHSA → `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`
with a reachability comment (precedent: `GHSA-vfj7-8cjw-p6xm` braces —
build-time globbing only, no patched release).

**Local gotchas for the gates** (entry 31/32 — CI is unaffected):
- `pnpm test` (turbo, 6 packages parallel) can OOM the vitest forks on a
  loaded machine → use `pnpm exec turbo run test --concurrency=1` before
  blaming code.
- `pnpm build` / `pnpm test:e2e` need env exported in the launching
  shell (`PAYLOAD_SECRET=… DATABASE_URI=… pnpm build`) — turbo does not
  inject root `.env` into `next build`/`next start`, and the prod-secret
  guard (entry 28) makes that loud.
- Page-data collection spawns ~15 workers (v8 NewSpace / Turbopack
  `HashMap::Initialize` OOM under ~2 GB free RAM — looks like a crash
  loop but it's memory pressure, not code) → `NEXT_BUILD_CPUS=4`
  (opt-in `experimental.cpus` env knob in `next.config.mjs`, unset =
  Next default).
- Killing a background dev server orphans the `next` child on :3000 →
  `netstat -ano | grep :3000` then `taskkill //PID <pid> //F`.
- After adding collection fields, **e2e fails on a stale DB** — schema
  push only runs on a `pnpm dev` boot, and `playwright` reuses whatever
  is on :3000 (`reuseExistingServer`). Boot dev once first, then run the
  suite against `pnpm start` (dev-mode first-compile can also eat the
  5 s assertion timeouts).

**Test counts (entry 57, #1–#394 + 12 e2e)**: web 172 · plugin-shop 144 ·
plugin-pc-builder 81 · lib 80 · plugin-pages 30 · ui 2 → **509 unit +
12 e2e**. Numbers are cumulative and cited in test titles; keep the
sequence when adding tests.

## turbo strict env mode

- `turbo.json` `env` allowlists gate which vars tasks see — **a new env
  var must be added there or `pnpm dev`/`build` silently drops it**
  (entry-24 CI failure: missing `DATABASE_URI` → empty sqlite file).
- Shell-injected vars are stripped from turbo children; `pnpm start`
  from `apps/web` bypasses turbo and inherits the launching shell —
  export env there (root fallbacks `file:./payload.db` + default
  `PAYLOAD_SECRET` will mask a missing `.env`).

## SQLite push (dev)

- `push: true` runs **on dev boots only** — adding a collection/global/
  block and only building leaves the table missing → prod 500s
  `no such table` (entries 18, 22; nested blocks create own tables,
  e.g. `pages_blocks_section`). After any schema addition: boot
  `pnpm dev` once (watch "Pulling schema from database…"), then prod.
- Never run `pnpm dev` and `payload run` concurrently — concurrent
  pushes race and are not idempotent.
- **Adding a collection breaks the push** (entry 32): drizzle's rebuild
  of the polymorphic `payload_locked_documents_rels` selects the
  not-yet-existing `<slug>_id` column → `SQLITE_ERROR` + `payloadInitError`.
  Pre-add it before the dev boot:
  `ALTER TABLE payload_locked_documents_rels ADD COLUMN <slug>_id text`
  (node + `@libsql/client`), then push converges. Expect this for every
  future collection addition.
- Adding a *field* to an existing collection (e.g. `transactions.
  discountCounted`, entry 33) pushes cleanly — the trap is new
  collections only.

## Dependencies & currency policy

- Overrides live in `pnpm-workspace.yaml` (pnpm 12 ignores
  `package.json` overrides): `esbuild@0.18.20→0.25.12`, `undici@^7.29.1`
  (**the undici override is what makes CI audit pass** — keep it).
- Peer window: payload 3.90.x wants `next >=15.4.11 <15.5.0 ||
  >=16.3.3 <17.0.0` — check `@payloadcms/next` peers before any bump.
- **Currency policy (user-directed)**: prefer latest *stable*; upgrade
  early when peer windows allow; verify version/peer/advisory facts via
  web research — never guess. Majors (payload 4, next 17, react 20,
  eslint 10) need user sign-off first. Record bumps here + progress log.
- Pin table (verify before touching): `next`/`eslint-config-next` must
  move together; `packageManager: pnpm@12.6.0`; `@playwright/test`
  1.63; keep `@payloadcms/plugin-seo` in apps/web (importMap needs it).
- Stray files in root `node_modules` mask undeclared deps — CI strict
  install is the arbiter; do not restore strays (entry 24).

## CI (`.github/workflows/ci.yml`)

All 8 gates blocking; Postgres 16 service proves schema push each run.
Local equivalent when changing schema: one dev boot. Push only when the
user asks.

## PowerShell

- Never inline JSON/quotes in `curl --data` — write to file,
  `curl.exe --data @file`.
- `Select-Object -First N` closes the pipe and kills the upstream
  process → false "exit -1"; capture to file, then grep.
- `curl -o $null` still dumps body to stream — use a real temp file.
- `` `n `` in single quotes is literal — use `ConvertFrom-Json` to
  validate scripted JSON edits, or the Edit tool.
- Session cookies: `-SessionVariable sv` + `-WebSession $sv`; manual
  `Cookie:` headers arrive broken.

## Verify

`pnpm workflow:check` (structure) → gate trio → `pnpm build` →
`pnpm test:e2e` (prod build + running server) → `pnpm audit`.

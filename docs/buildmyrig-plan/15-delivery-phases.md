# 15 · Phase-by-Phase Delivery Plan

Order per master prompt: shop core → builder → blocks/animations → hardening. Estimates assume 1–2 devs full-time; weeks are calendar estimates (A16).

## Where we are (live status — updated 2026-09-28)

| Item | Status | Notes |
| --- | --- | --- |
| Phase 0 — Foundations + spike | ✅ done | Path A (`@payloadcms/plugin-ecommerce`) adopted; SQLite dev fallback (no Docker on dev machine) |
| Phase 1 — Catalog, products, storefront, cart, checkout UI | ✅ done | `/shop/[categorySlug]`, `/product/[slug]`, `/cart`, `/checkout` live; 34 seeded products |
| Phase 1 — Stripe wiring | ✅ done | Conditional on `STRIPE_SECRET_KEY`; endpoints `/api/payments/stripe/*` |
| Phase 1 — e2e happy path (Playwright) | ⏳ blocked | Needs real Stripe test keys in `.env` (owner action) |
| Phase 2a — Rule engine (TDD) | ✅ done | 28/28 Vitest, 5k-component scale benchmark <20ms |
| Phase 2b — Builder collections + seed | ✅ done | 6 collections, 31 components / 9 slots, 42 rules, 2 build templates |
| Phase 2c — Admin rule manager + conflicts field | ✅ done | `/admin/compatibility-rules-manager`, live-conflicts ui field, builder index/conflicts/import endpoints; admin RootLayout bug fixed |
| Phase 2d — Configurator UI | ✅ done | `/builder` landing + `/builder/configure` step flow + `/builder/summary` stub; live filtering/warnings/power from the client engine; draft persisted in localStorage |
| Phase 2e — Summary + share + composite cart line + server validation at checkout | ✅ done | `POST /api/builder/builds` + share read + `POST /api/carts/:id/add-build` composite line + orders beforeChange re-validation; summary CTAs live |
| Phase 3 - Blocks + animations | done | Pages collection + 12 blocks + registry; homepage/marketing routes; sitemap/robots/JSON-LD; newsletter endpoint; sec-4 badge/fly/share animations |
| Phase 4 — Hardening & launch | in progress | Security/access review + fixes (entry 11); review round, dependency audit → 0 vulns (next 16.3.6 + esbuild override), CI audit/secret gates, admin training doc (entry 12); entry-12 review + real ESLint gate, Stripe webhook handlers + e2e idempotency proof, load test (entry 13); remaining: Stripe live e2e, Playwright/Lighthouse, Sentry, admin-GUI deltas |

Latest commits: `5284cbc` (2b), `eeeb067` (2c); Phases 2d+2e + 2e review fixes + Phase 3 + Phase 3 review fixes are in the working tree (not yet committed). Full detail: [18-progress-log.md](18-progress-log.md).

## Phase 0 — Foundations & spike (week 1)

Monorepo scaffold (pnpm + Turborepo, apps/web, packages/*), Payload 3 + Postgres + Drizzle wired, Tailwind 4 + shadcn/ui + tokens, ESLint/Prettier/CI, env config, docker-compose local DB.
**Spike (timeboxed 3 days)**: audit `@payloadcms/plugin-ecommerce` against criteria in [04-collections/products.md](04-collections/products.md); record Path A vs B decision (recommendation: Path A).
**DoD**: `pnpm dev` runs Payload admin; CI green on empty repo; ecommerce decision documented.

## Phase 1 — Shop core (weeks 2–4)

Catalog collections + attributes, products CRUD + media, faceted listing + search, product page, carts (guest + user + merge), discounts, checkout + Stripe adapter + webhook, inventory reservations, order lifecycle + emails, addresses/account basics. Security gates live ([11-access-security.md](11-access-security.md)).
**DoD**: e2e happy path passes (browse → filter → add → discount → checkout → webhook → order paid → email); prices server-recomputed; unit tests for pricing + discount logic; seeded 20 products.

## Phase 2 — PC builder (weeks 5–8)

Rule engine in `packages/lib` (TDD-first: 28 named tests from [06-rule-engine.md](06-rule-engine.md) green before UI), builder collections + server index cache, configurator UI (steps, rail, live filtering, warnings, power), summary + share + composite cart line item, server validation at checkout, admin rule manager grid + CSV import/export + conflicts field, fallback/stock logic.
**DoD**: all rule-engine tests pass incl. scale benchmark; e2e: guided mode → full build → add to cart → checkout; server rejects tampered build price; admin can author a rule and see it live in the configurator without redeploy.

## Phase 3 — CMS blocks & animations polish (weeks 9–10)

Pages collection + 12 blocks + registry, homepage/marketing pages, remaining animations (step transitions, price counter, cart feedback per [07-ux-plan.md](07-ux-plan.md)), share pages, newsletter, SEO metadata + JSON-LD + sitemap.
**DoD**: all blocks render from CMS; Lighthouse ≥ 90 LCP/CLS on homepage + product; staff can edit homepage without dev.
**Status (2026-09-28)**: done - all 12 blocks render from CMS (`/` + `/[slug]`), newsletter endpoint live, sitemap/robots/JSON-LD live, 4 badge/fly/share animations live (cart drawer + dialogs remain with their components in Phase 4). Code-reviewed (`code-review-checklist`): JSON-LD script-breakout XSS fixed (`serializeJsonLd`), dead export removed, Hero `video` variant wired (`videoUrl` + `embedUrlFor`, TDD). Lighthouse score not yet run.

## Phase 4 — Hardening & launch (weeks 11–12)

Security review (OWASP checklist), rate limiting, Sentry/uptime/alerting, analytics events, Playwright full suite + Lighthouse CI gates, migrations dry-run on production-like DB, load test checkout + webhook idempotency, admin training doc, legal pages, dependency audit clean.
Also carries the admin-GUI audit deltas deferred from entry 10 of [18-progress-log.md](18-progress-log.md): access-matrix tightening, rule-manager feature deltas (inline edit / export / CSV preview-diff beyond the current grid), Build Stats view, `rulesVersion`/cache-invalidation hooks.
**DoD**: OWASP review signed off; e2e green on preview with Neon branch; zero high vulns; go-live checklist complete.

## Dependencies

Phase 1 → Phase 2 (builder line items need cart/order infra); Phase 2 → Phase 3 (blocks showcase templates); Phase 3 → Phase 4. Within Phase 2, the rule engine and its tests come before any UI (order enforced in PRs).

## Testing strategy throughout

Vitest unit (rule engine ≥95% coverage, pricing, access-control helpers), Playwright e2e happy paths (shop, builder, checkout, webhook), seeded preview DB per PR.

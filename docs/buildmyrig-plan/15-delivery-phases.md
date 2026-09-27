# 15 · Phase-by-Phase Delivery Plan

Order per master prompt: shop core → builder → blocks/animations → hardening. Estimates assume 1–2 devs full-time; weeks are calendar estimates (A16).

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

## Phase 4 — Hardening & launch (weeks 11–12)

Security review (OWASP checklist), rate limiting, Sentry/uptime/alerting, analytics events, Playwright full suite + Lighthouse CI gates, migrations dry-run on production-like DB, load test checkout + webhook idempotency, admin training doc, legal pages, dependency audit clean.
**DoD**: OWASP review signed off; e2e green on preview with Neon branch; zero high vulns; go-live checklist complete.

## Dependencies

Phase 1 → Phase 2 (builder line items need cart/order infra); Phase 2 → Phase 3 (blocks showcase templates); Phase 3 → Phase 4. Within Phase 2, the rule engine and its tests come before any UI (order enforced in PRs).

## Testing strategy throughout

Vitest unit (rule engine ≥95% coverage, pricing, access-control helpers), Playwright e2e happy paths (shop, builder, checkout, webhook), seeded preview DB per PR.

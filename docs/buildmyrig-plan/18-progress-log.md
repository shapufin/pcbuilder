# 18 · Progress Log

Reverse-chronological work log. Each entry: what landed, verification, known gaps.

## 2026-09-28 — Phase 1c storefront + review fixes

- Storefront routes live: `/` (ISR 60s), `/shop/[categorySlug]` (faceted filters: brand, price bands, sort, pagination via URL params), `/product/[slug]` (metadata API, spec table, Add to cart), `/cart`, `/checkout` (graceful no-Stripe state), `/admin` (Payload).
- Wired Stripe payments: server `stripeAdapter` (inactive unless `STRIPE_SECRET_KEY` set) + client `stripeAdapterClient` in `EcommerceProvider`. Endpoints: `/api/payments/stripe/initiate|confirm-order|webhooks`.
- Review fixes: category-page 500 (object-spread-into-array bug → `productFilters` now returns `Where[]`), price field shape (plugin stores top-level `priceInEUR`/`priceInEUREnabled`, not nested under `prices` — seed + formatter + filter paths corrected), re-seeded DB.
- Verified: typecheck 5/5, production build clean, curl smoke test — home/category/filtered/product/cart all 200 with correct content and prices; admin 307→login.

## 2026-09-27 — Phase 0 + Phase 1a (shop core) landed

- Phase 0 commits `e9059f8`, `8ca0d06`, `80c730d`, `11a93eb`: monorepo, DB adapter switch, plugin skeletons, CI, ecommerce spike (Path A adopted).
- Phase 1 commit `12d9605`: `plugin-shop` on `@payloadcms/plugin-ecommerce` 3.90.2 (EUR single-currency), catalog collections, products override (title/slug/category/brand/gallery/attributes/specs), roles on Users, seed (20 products + variants).

## Current phase status (vs [15-delivery-phases.md](15-delivery-phases.md))

| Phase | Status |
| --- | --- |
| 0 Foundations + spike | ✅ done |
| 1 Shop core — catalog, products, seed | ✅ done |
| 1 Shop core — payments/Stripe wiring | ✅ done (needs real Stripe test keys for live e2e) |
| 1 Shop core — e2e happy path (Playwright) | ⏳ pending — needs Stripe test keys for checkout leg |
| 2 PC builder — rule engine TDD | ⏭️ next |
| 3 Blocks + animations · 4 Hardening | not started |

## Known gaps / watch items

- Playwright e2e and checkout DoD blocked on Stripe test keys in `.env` (owner action).
- Dev DB is SQLite fallback (Docker absent on this machine); Postgres parity verified only in CI plan.
- Product spec table reads `specsJson`; per-category facet sidebar is hardcoded brand/price for now — attribute-driven facets land with builder work.

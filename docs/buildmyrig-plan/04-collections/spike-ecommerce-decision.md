# Phase 0 Spike — `@payloadcms/plugin-ecommerce` Audit Decision

Date: 2026-09-27 · Timebox: 3 days (consumed ~half day; evidence sufficient)

## Verdict: **Path A — adopt `@payloadcms/plugin-ecommerce`** ✅

## Evidence

| Criterion | Finding | OK? |
| --- | --- | --- |
| Active maintenance | Latest stable 3.90.2/3.91 line; plugin commits Sep 17 2026 ("restore PostgreSQL settlement migration guidance"); part of core monorepo | ✅ |
| Composite line items | Not built-in (cart items reference product/variants). Mitigation: collections are customizable via factory functions (`createCartsCollection` etc., docs/ecommerce/advanced) — we add `lineType` + `configuredBuild` + `subItems` fields, and totals are recomputed by OUR checkout handler via the line-item extension registry (05-plugin-contracts.md). Plugin's cart item endpoints keep working for standard lines. | ⚠️ handled |
| Guest + user carts | Supported (guest carts via cart id in localStorage; customer-linked carts) | ✅ |
| Guest→user merge on login | Not exposed as a plugin hook → we implement in plugin-shop `afterLogin` (dedupe by variant, sum quantities) | ⚠️ ours |
| Inventory decrement | Core "atomically claims a pending transaction before creating the order, updating the cart, and decrementing inventory" (plugin README) | ✅ |
| Order settlement idempotency | "Stripe confirmation is idempotent per ecommerce transaction: retries return the same order" — fails closed on crash, status `processing` needs migration on Postgres | ✅ (we add that enum migration) |
| Transactional rollbacks | "Database adapters with transaction support roll back the complete settlement on failure" — Postgres ✅ | ✅ |
| Payment adapter | Stripe supported natively by plugin (we still inject via our `PaymentAdapter` wrapper for swappability) | ✅ |
| Multi-currency | Supported; we use single EUR v1 | ✅ |
| Order status machine | Plugin provides statuses; extended statuses (fulfilled/shipped/delivered) added via our collection customization | ⚠️ ours |

## Required integration work (goes into Phase 1)

1. Add `processing` to ecommerce transaction status enum in the Postgres migration (per README).
2. Extend carts/orders collection definitions with composite line fields (lineType/configuredBuild/subItems) through the plugin's collection factory options.
3. Implement guest-cart merge on login in plugin-shop.
4. Wrap plugin checkout in our `/api/checkout` handler + line-item extension registry for totals.

## Decision log

- Path B (own collections) rejected: plugin already solves the hardest part (idempotent settlement, atomic inventory, transactional rollback) — reimplementing that is the riskiest shop code there is.
- Risk #1 in 16-risks.md downgraded: Medium→Low.

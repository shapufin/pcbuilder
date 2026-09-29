# 08 · API Surface

All custom endpoints are Payload REST endpoints (`config.endpoints`) or Next.js route handlers under `/api`. **Every** custom endpoint validates input with zod at the handler boundary. Auth column: none / jwt (customer) / staff role / internal.

## Builder endpoints (plugin-pc-builder)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/builder/index` | none (public, cache tag `builder-index`) | — | `BuilderIndex` JSON (gzip; ≤300KB budget) |
| POST | `/api/builder/builds` | jwt (nullable user for guests) | `{ slots: { categoryId, componentIds[] }[], name? }` | `{ id, shareId, validationSnapshot, priceSnapshot }` |
| GET | `/api/builder/builds/:shareId` | none | — | public-safe build view (no owner PII) |
| GET | `/api/builder/rules/conflicts` | staff (admin) | `?componentId=` | `{ conflicts: [{ rule, other }] }` (conflictsFor output) |
| POST | `/api/builder/rules/import` | admin | multipart CSV | `{ valid: n, errors: [{row, message}], committed: bool }` (dryRun=true default) |
| GET | `/api/builder/rules/export` | admin | — | CSV |
| POST | `/api/builder/templates/:id/use` | none | — | `{ buildId }` (increments popularity) |
| GET | `/api/builder/stock/:categoryId` | none | `?excludeIds=` | top 5 in-stock compatible alternatives (fallback suggester) |

**Implementation status (2026-09-29)**: `GET /api/builder/index`, `GET /api/builder/rules/conflicts`, `POST /api/builder/rules/import` are live (import takes JSON `{ rows }` from the admin view rather than multipart CSV; CSV parsing happens client-side). **Entry 14 added**: `dryRun: true` → `{preview, entries, summary, errors}` preview-diff (commit honors skips → `{created, skipped, errors}`; category subjects/targets resolve by slug **or** name so CSV-export round-trips work) and `GET /api/builder/stats` (staff+: revenue, order/build status counts, top templates, low stock). As of Phase 2d the index also carries per-component `display` (name/brand/image/description/cosmetic specs) and category `helperText`/`icon` — the configurator renders entirely from this one payload; its `rulesVersion` is now a composite of rules+components+categories+power-rule timestamps with a 30 s cache + invalidation hooks (entry 14). **Phase 2e added**: `POST /api/builder/builds` (save; server re-validates + re-resolves price, guests allowed, **422 with `reasons` on unknown ids or rule violations** — `findUnknownSlotRefs` guard, see 18-progress-log entry 7), `GET /api/builder/builds/:shareId` (public-safe view), `POST /api/builder/templates/:id/use` (popularity + build creation), `GET /api/builder/stock/:categoryId` (top-5 alternatives), and `POST /api/carts/:id/add-build` (composite line — the ecommerce add-item endpoint requires `product`, so composite lines get their own collection endpoint; price comes from the registered `resolveLine` via the cart subtotal hook). CSV **export** is currently client-side in the rule manager view (not a `/api/builder/rules/export` endpoint). Raw REST `POST /api/configured-builds` is **staff-only** — guest saves go exclusively through the rate-limited endpoint above (anti rate-limit-bypass / field-spoofing).

## Shop endpoints (plugin-shop)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/checkout` | jwt or guest (cart id + signed cart token) | `{ cartId, discountCode?, configuredBuildId? }` | `{ url }` (Stripe hosted checkout URL) |
| POST | `/api/discounts/validate` | none | `{ code, cartId }` | `{ valid, discountTotal, message? }` |
| POST | `/api/carts/:id/validate` | guest (cart `secret`) or owner | `{ secret? }` | `{ ok, checked }`; 422 `{ error, reasons[] }` on incompatible builds; 404 cart/secret mismatch |
| POST | `/api/payments/stripe/webhooks` | Stripe signature | raw event | 200 `{received:true}` (CAS-idempotent; 400 on bad/expired signature; route exists only when `STRIPE_SECRET_KEY` set) |
| POST | `/api/orders/:id/refund` | staff | `{ amountCents? }` | `{ status }` (full/partial refund via adapter) |
| GET | `/api/orders/mine` | jwt | — | order list (owner-scoped — IDOR check) |

## Standard Payload REST (for reference)

All collections also expose Payload's generated REST + GraphQL (https://payloadcms.com/docs/rest-api/overview) with collection access control applied — but storefront server code uses the **Local API** exclusively.

## Local API usage map (server-side data access in apps/web)

| Route (RSC) | Local API calls |
| --- | --- |
| `/` homepage | `payload.find({ collection: 'pages', where: { isHomepage } })` + block rels |
| `/shop/[categorySlug]` | `payload.find({ collection: 'products', where: facets, sort, page })` + attribute aggregate for filter counts |
| `/shop/search` | Postgres full-text on products (tsvector via Drizzle index) |
| `/product/[slug]` | `payload.find` products by slug + variants + prices + inventory |
| `/builder` | templates find; `getBuilderIndex()` cached |
| `/build/[shareId]` | configuredBuilds by shareId |
| `/cart`, `/checkout` | carts/orders via Local API |
| `/account` | orders/addresses/configuredBuilds by user |
| webhook handler | Local API order/transaction updates |

## Webhook route `POST /api/payments/stripe/webhooks` (adapter endpoint mounted by `stripeAdapter`)

Signature verification (`stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`); dispatch to `webhooks` handlers in `packages/plugin-shop/src/payments/stripe-webhooks.ts`: `payment_intent.succeeded` (settle txn → order → inventory), `payment_intent.payment_failed`, `charge.refunded` (full). Idempotency = state-machine CAS guards on the transaction (replays no-op) — e2e-proven in entry 13. Unhandled/failing events log to server (Sentry + Resend alert to staff still to wire, see [12-integrations-ops.md](12-integrations-ops.md)).

## Rate limiting

All public POST endpoints (`/api/checkout`, `/api/discounts/validate`, `/api/carts/:id/validate`, `/api/builder/builds`, `/api/builder/templates/:id/use`, `/api/carts/:id/add-build`) limited with Upstash Ratelimit (sliding window; checkout 10/min/IP, validate 20/min/IP, builds 30/min/IP). Enforced at handler top; 429 response with `Retry-After`. **Current implementation**: the in-memory sliding window in `packages/lib/rate-limit.ts` (bounded — stale keys swept each window + `maxKeys` hard cap against spoofed-IP growth); swap to Upstash when running multi-instance (12-integrations-ops.md).

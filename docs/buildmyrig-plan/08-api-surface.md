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

**Implementation status (2026-09-28)**: `GET /api/builder/index`, `GET /api/builder/rules/conflicts`, `POST /api/builder/rules/import` are live (import takes JSON `{ rows }` from the admin view rather than multipart CSV; CSV parsing happens client-side; no dryRun yet — committed directly). Builds/share/export/templates-use/stock endpoints land with Phase 2d/2e. CSV **export** is currently client-side in the rule manager view (not a `/api/builder/rules/export` endpoint).

## Shop endpoints (plugin-shop)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/checkout` | jwt or guest (cart id + signed cart token) | `{ cartId, discountCode?, configuredBuildId? }` | `{ url }` (Stripe hosted checkout URL) |
| POST | `/api/discounts/validate` | none | `{ code, cartId }` | `{ valid, discountTotal, message? }` |
| POST | `/api/stripe/webhook` | Stripe signature | raw event | 200 (idempotent by event id; signature verified) |
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

## Webhook route `/api/stripe/webhook` (Next.js route handler, not Payload endpoint)

Signature verification (`stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`), idempotency by `event.id` (insert-once into transactions.raw log), handled events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `payment_intent.payment_failed`. Retry alerting: unhandled/failing events logged to Sentry + Resend alert to staff (see [12-integrations-ops.md](12-integrations-ops.md)).

## Rate limiting

All public POST endpoints (`/api/checkout`, `/api/discounts/validate`, `/api/builder/builds`, `/api/builder/templates/:id/use`) limited with Upstash Ratelimit (sliding window; checkout 10/min/IP, validate 20/min/IP, builds 30/min/IP). Enforced at handler top; 429 response with `Retry-After`.

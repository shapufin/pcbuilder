# 12 · Integrations & Ops

## Payments — Stripe

- Injected as `PaymentAdapter` (contract in [05-plugin-contracts.md](05-plugin-contracts.md)). Stripe hosted Checkout (PCI scope minimal), full + partial refunds via adapter.
- **As implemented (entry 13)**: route `POST /api/payments/stripe/webhooks` (Payload adapter endpoint, *not* a Next.js route — mounted by `@payloadcms/plugin-ecommerce`'s `stripeAdapter` only when `STRIPE_SECRET_KEY` is set): signature verify (`constructEvent` + `STRIPE_WEBHOOK_SECRET`, 400 on bad/expired sig) → dispatch to `webhooks` handlers in `packages/plugin-shop/src/payments/stripe-webhooks.ts`. Handled events: `payment_intent.succeeded` (settle: CAS-claim txn → create order → cart purchased → inventory decrement), `payment_intent.payment_failed` (pending→failed), `charge.refunded` (full only). Idempotency = **state-machine CAS guards on the transaction** (replays no-op), not an event-id store — proof: e2e 14/14 incl. replay (entry 13). Plan sketch below (`checkout.session.*`, event-id log) is superseded by this line.
- Retry alerting: handler failure → log (Sentry/Resend wiring pending); Stripe retries up to 3 days, CAS idempotency makes replays safe. **Deploy order**: migrate schema first (the `transactions` `stripe`/`paymentMethod` fields exist only once an adapter is configured), then set keys.

## Email — Resend

Chosen over SES for: simple DX, react-email templating fits our component stack; low volume (transactional only) makes pricing irrelevant (A14). Templates (react-email): `order-confirmation`, `shipping-notification` (tracking), `password-reset`, `low-stock-alert` (staff), `contact-form` (staff), `newsletter-welcome`. Sender domain verified via DNS; all sends logged to `payload.logger` + Sentry breadcrumbs.

> **Status (2026-09-28)**: `POST /api/newsletter` is live (zod email validation, 5/min/IP rate limit via `@buildmyrig/lib`, sends through Resend `/emails` only when `RESEND_API_KEY` + `EMAIL_FROM` are set - otherwise dry-run log + `{ok:true,dryRun:true}`). Wire the Resend templates/audience above for production.

## Storage — `@payloadcms/storage-s3`

S3-compatible bucket (Cloudflare R2 acceptable) for uploads; `hero/gallery/card/thumb` sizes; presigned admin uploads via Payload's storage plugin config (https://payloadcms.com/docs/upload/storage-s3).

## Analytics

Recommendation: **Plausible** (A15) — lightweight, no cookie-consent burden in EU (we launch single-currency EUR, EU market), privacy posture fits the brand; GA4 only if marketing later demands Google-ads attribution. Event list (SPA + server hybrid):

| Event | Where fired |
| --- | --- |
| `view_item` | product page view |
| `add_to_cart` | cart add (any line type) |
| `begin_builder` | builder landing start action |
| `build_step_completed` | each required slot filled |
| `build_completed` | build added to cart |
| `purchase` | order-paid webhook (server-side) |

## Admin dashboards

v1: custom Payload "Build Stats" view (cards: revenue, orders count, popular templates, completed builds, low-stock list) querying aggregate Local API counts, cached 5 min. No external BI in v1 (A12); Metabase optional later if ops needs ad-hoc SQL.

## CI/CD — GitHub Actions

| Workflow | Steps |
| --- | --- |
| `ci.yml` (every PR) | pnpm install (turbo cache) → lint → typecheck → vitest unit (rule engine gate ≥95% coverage) → build all packages → Playwright e2e (preview deployment URL) |
| `preview.yml` | Vercel preview deploy per PR + Neon branch database per PR (branch per preview) |
| `deploy.yml` (main) | Vercel production deploy → `payload migrate` step runs against production DB (pre-deploy hook) → smoke test `/` + `/admin` |
| `security.yml` | `pnpm audit --prod`, Dependabot, git-secrets scan |
| security review gate | security-review subagent on auth/payment PRs (see [11-access-security.md](11-access-security.md)) |

Migrations strategy: `payload migrate` generates Drizzle SQL; migration files committed to repo; production migrations run via `payload migrate` in the deploy step (forward-only; destructive changes split into two releases).

## Environments & env vars

| Env | Frontend | DB |
| --- | --- | --- |
| local | `localhost:3000` | local Postgres (docker-compose) |
| preview | Vercel preview URL per PR | Neon branch DB |
| production | BMR_URL | Neon/Supabase pooled |

Complete env var list:

```
DATABASE_URI=postgres://...            PAYLOAD_SECRET=<random 32+>
BMR_URL=https://buildmyrig.com         BMR_PREVIEW_URL= (optional)
STRIPE_SECRET_KEY=sk_...               STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
RESEND_API_KEY=re_...                  EMAIL_FROM=orders@buildmyrig.com
S3_BUCKET= / S3_REGION= / S3_ACCESS_KEY_ID= / S3_SECRET_ACCESS_KEY=
S3_ACCELERATE_URL= (R2 endpoint)
UPSTASH_REDIS_REST_URL= / UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN= / SENTRY_ENV= (local|preview|production)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
```

## Monitoring

- Sentry (both Next.js client + server SDKs): error tracking, release tagging per deploy.
- Uptime: Better Stack (or UptimeRobot) on `/` + `/api/builder/index` (200 check).
- Stripe webhook failures → Sentry alert + Resend staff email.
- Vercel Analytics for Core Web Vitals field data (see [13-performance-seo.md](13-performance-seo.md) budgets).

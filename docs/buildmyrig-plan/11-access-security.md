# 11 · Access Control & Security

## Roles

`admin` (full), `manager` (content + shop ops), `staff` (order fulfilment), `customer` (self-service), guest. Roles stored on the `users` collection (`role` select field; default `customer`-equivalent via customers collection). Admin UI access gated by `admin`/`manager`/`staff`.

## Access control matrix

| Collection | Public (unauthenticated) | Customer | Staff | Manager | Admin |
| --- | --- | --- | --- | --- | --- |
| products / categories / brands / attributes | read published | read published | read | write | write |
| variants | read published | read published | read + stock write | write | write |
| prices / inventory | `inStock` boolean only via product view | same | read exact + write stock | write | write |
| discountCodes | none (validate endpoint only) | none | read | write | write |
| carts | create/update own guest cart (cart token) | own | read | read | write |
| orders | none | read own (IDOR-checked) | read + status→fulfilled/shipped | read + status write | full |
| transactions | none | read own (via order) | read | read | write (refund) |
| shipments | none | read own | write | write | write |
| addresses | none | own CRUD | read | read | write |
| customers | none | own (basics) | read | write | write |
| componentCategories / components / buildTemplates | read | read | read | write | write |
| compatibilityRules / derivedPowerRules | read (engine index only — raw REST hidden) | read index | read | write | write |
| configuredBuilds | create (guest), read by shareId | own CRUD | read | read | write |
| media | read | read | write | write | write |
| pages / redirects | read published | read published | read | write | write |
| users | none | self read | none | none | write |

Field-level: customers.notes staff+only; configuredBuilds.user read by owner/staff only (share view excludes it); inventory.quantity masked for public (boolean inStock + low flag only). Implemented with Payload field-level `access` + `read: ownerOrStaff` patterns.

## Authentication

- Payload auth email/password (https://payloadcms.com/docs/auth/overview), bcrypt hashing, `maxLoginAttempts` + `lockTime` enabled, password reset via Resend.
- Sessions: httpOnly, secure, SameSite=Lax cookies (CSRF posture: Payload `csrf` origin allowlist = `BMR_URL` + localhost — enforced since entry 11; all mutating custom endpoints additionally require the cart/session token or JWT).
- OAuth (Google) — Phase 2 (assumption A13).

## Security checklist (enforced in plan + CI)

| # | Item | Mechanism |
| --- | --- | --- |
| 1 | Input validation | zod schema per custom endpoint handler (see [08-api-surface.md](08-api-surface.md)); Payload field validation for CMS writes |
| 2 | CSRF | Payload CSRF config (trusted origin list) + SameSite cookies + JWT on custom mutations |
| 3 | Stripe webhook | signature verification, raw body, event-id idempotency |
| 4 | Price tampering | client never submits prices/quantities' prices — server recomputes from DB (06-rule-engine.md §server flow); discount revalidated server-side |
| 5 | IDOR | every order/build/address read scoped by `user.id` or shareId; checkout validates cart ownership (cart token HMAC) |
| 6 | Rate limiting | Fixed-window in-memory limiter (`rateLimit` in `@buildmyrig/lib`) on public POSTs (checkout confirm via plugin defaults, builds 30/min, use-template 30/min, add-build 30/min, validate 20/min, newsletter 5/min). Single-instance only — swap for Upstash if deploying serverless multi-instance |
| 7 | Secrets | Vercel env vars / Doppler locally; never in repo; `git-secrets` scan in CI |
| 8 | Upload validation | mime whitelist (jpeg/png/webp/avif), 8MB cap, S3 key sanitization by Payload upload |
| 9 | Dependency audit | `pnpm audit --prod` + Dependabot in CI; block on high/critical |
| 10 | OWASP review gate | security-review skill run on all PRs touching auth/payments (mandatory pre-merge, see below) |
| 11 | SQL injection | Drizzle parameterized queries only (Payload); raw SQL forbidden outside migrations |
| 12 | XSS | React escaping + richtext sanitized on render; no `dangerouslySetInnerHTML` except sanitized HTML |

## Pre-merge gates

- PRs touching `plugin-shop` auth/payment paths, `/api/checkout`, `/api/stripe/webhook`, auth collection, or access control files: run the security review subagent prompt (repo `SECURITY_REVIEW_PROMPT.md`) — mandatory, blocking.
- All other PRs: lint, typecheck, unit tests, build (see [12-integrations-ops.md](12-integrations-ops.md) CI).
- OWASP top-10 review completed before launch gate (Phase 4).

## Enforcement status (entry 11 — Phase 4 audit)

First full pass done with the `security-review` skill; 5 findings fixed (see progress-log entry 11): Users privilege escalation (critical), media write/mime over-share (high), configured-builds matrix mismatch (medium), missing `csrf` allowlist (medium), public 500 message leaks (low). Remaining from this checklist: checklist #7 (`git-secrets` scan in CI), #9 (`pnpm audit --prod` gate), #10 OWASP re-run on payment paths once Stripe keys land.

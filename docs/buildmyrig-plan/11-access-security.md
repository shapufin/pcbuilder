# 11 · Access Control & Security

## Roles

`admin` (full), `manager` (content + shop ops), `staff` (order fulfilment), `customer` (self-service), guest. Roles stored on the `users` collection as a **multi-select array** (`roles`, options `admin|manager|staff|customer`, `defaultValue: ['customer']` since entry 15 — registration can only ever produce customers; payload field access pins the field to admin-only writes, and `POST /api/auth/register` re-pins `roles: ['customer']` server-side after its zod strip). Admin UI access gated by `admin`/`manager`/`staff`.

## Access control matrix

| Collection | Public (unauthenticated) | Customer | Staff | Manager | Admin |
| --- | --- | --- | --- | --- | --- |
| products / categories / brands / attributes | read published | read published | read | write | write |
| variants | read published | read published | read + stock write | write | write |
| prices / inventory | `inStock` boolean only via product view | same | read exact + write stock | write | write |
| discountCodes | none (validate endpoint only) | none | read | write | write |
| carts | create/update own guest cart (cart token) | own | read | read | write |
| orders | none | read own (IDOR-checked; also guest orders by `customerEmail` — entry 15) | read + status→fulfilled/shipped | read + status write | full |
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

- Payload auth email/password (https://payloadcms.com/docs/auth/overview), bcrypt hashing, `maxLoginAttempts: 5` + `lockTime: 10 min` configured on the auth collection (entry 15 — payload creates the lockout columns itself; production must run a schema push/migration when this first deploys). Password reset via Resend is **still deferred** — no forgot-password link ships (entry 15 decision).
- **Registration** (`POST /api/auth/register`, entry 15): zod-validated (email format, password 8–200), origin-allowlist check (same policy as CSRF #2 — cross-origin form posts rejected), 5/min/IP limiter, duplicate email → **409**, server-pinned `roles: ['customer']`, generic 500 (details server-log only), then auto-login via payload's `/api/users/login`.
- **Account guard** (entry 15): `src/proxy.ts` (Next 16 middleware) 307s anonymous `/account/**` to `/auth/login?next=…` (cookie fast-path only); the account RSC re-validates with `payload.auth` (garbage/expired cookies → treated as anonymous). `/checkout` is **deliberately unguarded** — guest checkout is a feature (deviation from the original middleware plan, documented in `proxy.ts`).
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
| 6 | Rate limiting | Fixed-window in-memory limiter (`rateLimit` in `@buildmyrig/lib`) on public POSTs (checkout confirm via plugin defaults, builds 30/min, use-template 30/min, claim 30/min, add-build 30/min, validate 20/min, register 5/min, newsletter 5/min). Single-instance only — swap for Upstash if deploying serverless multi-instance. **IP keying caveat below (entry 15)** |
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

First full pass done with the `security-review` skill; 5 findings fixed (see progress-log entry 11): Users privilege escalation (critical), media write/mime over-share (high), configured-builds matrix mismatch (medium), missing `csrf` allowlist (medium), public 500 message leaks (low). **Entry 14** tightened the matrix rows themselves across 11 collections (shared `isStaff`/`isManager` helpers in both plugins, tests `access-matrix.test.ts`, live-verified 403/401/200). Remaining from this checklist: checklist #10 OWASP re-run on payment paths once Stripe keys land (#7 secret scan and #9 audit gate shipped in entry 12).

## Rate-limit IP keying — deployment contract (entry 15 security review, VULN-01 Medium)

`clientIp` (`apps/web/src/lib/auth.ts`) and the two sibling keyers (`plugin-pc-builder/src/endpoints.ts`, `plugin-shop/src/endpoints.ts`) take the **leftmost `X-Forwarded-For` hop**, which is client-controlled whenever the origin is reachable directly (this app's self-hosted `pnpm start` path has no proxy). Consequence: all IP-keyed limiters (register, builds, use-template, claim, …) are spoofable with a forged header. Not fixable in-app — Next.js route handlers don't expose the socket peer address — so the limits are treated as abuse **defense-in-depth, not a security boundary**, and the real boundary is independent: payload's per-account `maxLoginAttempts` lockout, origin allowlist/CSRF, and role scoping.

**Required production configuration**: deploy behind a reverse proxy/CDN that **overwrites** `X-Forwarded-For` and `X-Real-IP` and never expose the origin directly. On serverless multi-instance hosts the in-memory limiter itself swaps to Upstash (12-integrations-ops.md), which keys on the platform's request IP instead.

## Open security notes (entry 15 review)

- **VERIFY-001 — claim TOCTOU**: `POST /api/builder/builds/claim` reads the build (`user: null`) then writes. Two sessions claiming the same shareId in the same instant could both observe `user: null` and both get `claimed: true` (data harm: one build, two "owners" of the same row — the loser's later read still shows the winner's owner). Sequential claims are correct (403 foreign / idempotent `alreadyClaimed`). Hardening deferred: make the attach a CAS (`updateMany` with `where: { user: { exists: false } }`).
- **VERIFY-002 — register-409 enumeration**: a duplicate-email 409 confirms an address exists. Accepted tradeoff — standard signup-flow behavior; payloads' own pre-check makes it unavoidable without email-first flows (which need the deferred Resend adapter anyway).

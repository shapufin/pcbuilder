# 03 — Security & access control

Canonical doc: `docs/buildmyrig-plan/11-access-security.md`.
Payment/auth changes trigger the `security-review` skill in addition to
`code-review-checklist`.

- **Raw `inventory` counts are staff+ only** (matrix row 13, entry 42):
  the plugin-ecommerce `inventory` field is pinned to staff read on
  products + variants via `maskInventoryRead` / `staffReadOnly`
  (`packages/plugin-shop/src/lib/inventory-access.ts`) — public gets the
  `inStock` boolean from the product view. Server-side consumers are
  unaffected (local API defaults `overrideAccess: true`; settlement uses
  the db adapter).
- **Matrix resolved (entry 43, all decisions taken)**: `transactions` is
  staff+ read / admin-only write (`transactionsAccess`, #272);
  `addresses` is staff-or-own read (`staffOrOwnAddressRead`, #273).
  Kept as documented deviations (matrix updated): variant stock-write
  stays manager+, `customers` stays collapsed into `users`, `redirects`
  and `shipments` not built (status-only fulfilment; out of scope until
  a carrier/3PL or URL-migration need exists).

## Roles & helpers

- Roles: `admin`, `manager`, `staff`, `customer` (id1 admin, id2
  manager, id3 staff `staff@buildmyrig.test`; `admin@buildmyrig.test` /
  `Password123!`).
- Shared helpers `isStaff` / `isManager`:
  `packages/plugin-pc-builder/src/lib/access.ts` and
  `packages/plugin-shop/src/lib/access.ts` (entry-14 matrix; tests
  `collections/access-matrix.test.ts`). 11 collections were tightened
  in entry 14 — use the helpers, never inline role checks.
- `Users.ts`: `maxLoginAttempts: 5`, `roles` defaults `['customer']`;
  the privilege-escalation fix (entry 11) pins role writes to admin.
  Registration (`src/lib/auth.ts` `registerUser`) hard-pins
  `roles: ['customer']` regardless of posted roles.

## CSRF / Origin

- Cookie-authed requests need `Origin: http://localhost:3000`
  (allowlist: `BMR_URL` + localhost; trailing slashes normalized).
  Config: `apps/web/src/payload.config.ts`.
- **This applies to GETs too** — a REST GET with a session cookie and
  no Origin returns `200 {user:null}`/401 that *looks* like an auth
  failure. Browsers are fine; curl/scripts must send the header.

## Rate limits

- In-memory, single-instance, IP-keyed (`packages/lib` rate limiter) —
  documented deviation from the Upstash plan.
- **Leftmost `X-Forwarded-For` is trusted** — client-controlled when the
  origin is reached directly; prod must sit behind a proxy that
  overwrites XFF/X-Real-IP (entry-15 VULN-01; contract in
  `11-access-security.md`). Dev-first: acceptable locally.
- Register: 5/min/IP + 409 dup + origin check. Password reset: 5/min/IP,
  always-200 (anti-enumeration — unknown email is byte-identical).

## Auth flows

- `src/lib/auth.ts`: `registerUser`, `clientIp`, `sanitizeNext`,
  `accountGuard` (tests `#77–84/88`). `src/proxy.ts` is the Next 16
  middleware — guards `/account`; **`/checkout` deliberately
  unguarded** (guest checkout).
- Password reset (`src/lib/password-reset.ts` + `/api/auth/
  {forgot-password,reset-password}`): payload token contract, session
  cookie via `generatePayloadCookie`, href-escaped reset link,
  send-failure still returns 200. Prod redacts tokens from logs (#180).
- Build claim endpoint: 401/403/idempotent — see 02-builder.

## Data-exposure rules

- SVG uploads are banned (stored XSS). Media write is staff-scoped
  (`plugin-shop/collections/media.ts`).
- `configured-builds` access tightened entry 11 — guests can create,
  reads are owner/staff scoped.
- API error responses must not leak internals (entry-11 fix) — return
  generic messages; details go to server logs only.
- Order/email templates escape ALL customer-controlled interpolation —
  see 01-commerce.

## Verify

- Access tests `#45–52`, `#59–63`, `#128–130`, `#143` via `pnpm test`.
- Live matrix probe: anonymous/manager/staff × read/update on the 11
  tightened collections → expected 401/403/200 table in entry 14.

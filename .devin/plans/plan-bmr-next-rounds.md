---
created: 2026-10-02
status: ready-for-next-chat
supersedes: plan-81ceacba0d32bb44.md (entry-25 workflow bootstrap — done)
---

# BuildMyRig — next rounds (handoff plan)

## Start here (new chat bootstrap)

1. `AGENTS.md` (router + guardrails) → `.devin/context/00-INDEX.md` → this file.
2. State: **entries 25–34 are uncommitted** in the working tree; `main` is at
   `29ed1b5` (through entry 24, CI green).
3. Gates to reproduce before/after any change:
   `pnpm exec turbo run test --concurrency=1` (parallel turbo OOMs the vitest
   forks on this machine) → `pnpm -r typecheck` → `pnpm lint` →
   `PAYLOAD_SECRET=… DATABASE_URI=file:./payload.db pnpm build` →
   `cd apps/web && PAYLOAD_SECRET=… DATABASE_URI=… pnpm test:e2e` →
   `pnpm workflow:check`.
4. Guardrails: never commit/push unless the user asks; TDD (RED → GREEN);
   read the matching `.devin/context/*.md` before editing a domain;
   plugin boundary lint is blocking; no raw hex in `apps/web/src/**`.

Current baseline: **339 unit + 11 e2e green**, typecheck 4/4, lint 4/4,
build green, `workflow:check` PASSED.

## What is already done (do not redo)

- Entries 30–32: checkout, discounts, shipping bands, tax, **inventory
  reservations**, merge caps, `confirmOrder` composite crash — **all 7
  blocking gap-register items closed** (`docs/buildmyrig-plan/19-feature-audit.md`).
- Entry 33: review round (4 findings fixed) + patch regression pins.
- Entry 34: analytics funnel events.
- **Entries 35–44 (all done — Round C is empty)**: per-item plans written;
  C1 checkout address+country tax (entry 36), C8 derived-power singleton
  (37), C4 reservations at scale (38), C9 doc/alias drift (39), C5
  wishlist staleness (40), C6 seed fidelity + C7 index measured + C10
  deployment checklist (41), C3 decisions + raw-inventory masking (42–43),
  **entry 44: 3-reviewer code-review pass — all findings fixed**
  (settlement hardening, shareId, checkout 3DS/€0/retry, minors).
- Details: `docs/buildmyrig-plan/18-progress-log.md` entries 30–44.

---

## Round A — ✅ DONE (entry 45)

Committed as 4 domain-scoped commits (the 8-way split needed hunk-level
staging on files shared across entries — the documented fallback applied):
`e728ba5` workflow layer + next 16.3.8 · `1392a36` builder/lib audit fixes ·
`80ceed8` shop+web commerce hardening · `fd05ffc` docs entries 25–44 ·
`11210f7` docs 45. **Pushed to `origin/main`** (2026-10-03); tree clean.

<details><summary>Original split reference</summary>

| # | Commit | Contents |
|---|---|---|
| A1 | `chore(workflow): .devin AI-workflow layer + next 16.3.8` | `.devin/**`, `PROJECT_INDEX.md`, `CLAUDE.md`, `scripts/*.mjs`, `apps/web/package.json` (next bump) |
| A2 | `fix(audit): 5-pass feature-audit inline fixes` | the audit-round source fixes (builder, categories/templates drafts, CSV, seed, auth, X3 gaps) |
| A3 | `feat(shop): embedded Stripe checkout` | checkout page + `StripePaymentForm.tsx` |
| A4 | `feat(shop): discounts, shipping bands, tax — server-computed cart totals` | `pricing.ts`, collections, endpoints, cart hook, patch hunk 2, seed |
| A5 | `feat(shop): inventory reservations + oversell guards` | `reservations.ts`, `inventory-reservations` collection, webhook integration, patch hunk 3 |
| A6 | `fix(shop): review-round findings` | conversion CAS, `discountCounted` marker, best-effort release, patch amount fix, `patches.test.ts`, **entry-44 settlement hardening** (stale-claim resume, orphan reuse, `inventoryProgress`, `charge.succeeded`) + `transaction-snapshot.ts` + access helpers |
| A7 | `feat(web): analytics funnel events` | analytics helpers + `ViewItemTracker` + call sites |
| A8 | `docs: progress-log entries 25–44 + status tables` | progress log, audit doc, 00-index, 15-delivery-phases, AGENTS.md, context files, seed-data split |

**Acceptance**: `git status` clean; CI all 8 gates green on push;
`git log` messages follow the repo style (why-not-what, no secrets).

**Risk**: A2–A5 touch overlapping files (`plugin-shop/src/index.ts`,
`line-item-hooks.ts`, `stripe-webhooks.ts`) — split by hunks
(`git add -p`) or accept fewer, larger commits (A3+A4+A5 as one
`feat(shop): checkout, discounts, shipping, tax, reservations`).

</details>

---

## Round B — Owner-keyed live verifications (blocked on the user)

Each is *verify-only*: no code change expected unless a probe fails.
**Attempted 2026-10-03** — all blocked locally: `.env` has only
`DATABASE_URI`/`PAYLOAD_SECRET`/`STAFF_ALERT_EMAIL` (no Stripe/Resend/
Sentry/Plausible keys); no `docker`, no local `psql` (Postgres dry-run
needs an external DB or container).

| Item | Needs | What to prove |
|---|---|---|
| Stripe live e2e | `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (+ `STRIPE_WEBHOOK_SECRET`, `stripe listen`) | full checkout: `cart.total` charged (not subtotal), discount `usedCount` +1 once, reservation `held → converted`, composite stock decremented once, webhook + poll races both settle exactly once |
| Resend live send | `RESEND_API_KEY` + `EMAIL_FROM` | all 6 templates render + deliver |
| Postgres `migrate` dry-run | Docker or a Postgres URL | `payload migrate` produces/applies files (CI already proves drizzle *push* on postgres:16) |
| Sentry + alerting | DSN | errors captured, alert fires |
| Plausible | domain | events arrive (funnel now instrumented) |

---

## Round C — ✅ ALL DONE (entries 36–44)

All ten items landed; details in `18-progress-log.md`:

1. ✅ **Checkout shipping address + country tax** — entry 36 (#241–251).
2. ✅ **`Shipments`** — declared out of scope until a carrier/3PL need
   (entry 43 decision; matrix + register updated).
3. ✅ **Access-matrix deviations** — entries 42–43: raw `inventory`
   masked, transactions + addresses staff-read aligned to spec;
   stock-write/customers/redirects declared deviations.
4. ✅ **Reservations at scale** — entry 38: supersede on
   double-initiate, per-cart scoped availability read, indexed status.
5. ✅ **Wishlist stale snapshots** — entry 40: `/api/wishlist/check` +
   unavailable-item marking.
6. ✅ **Seed fidelity** — entry 41: spec table matched, verified on a
   scratch DB; `seed-data.ts` + invariant tests.
7. ✅ **Builder index size** — entry 41: measured 23.3 KB raw / 2.9 KB
   gzip at 33 components (~43 KB gzip at 500).
8. ✅ **`derived-power-rules` uniqueness** — entry 37: `beforeValidate`
   singleton guard.
9. ✅ **Doc/alias trivia** — entry 39.
10. ✅ **Prod-hardening deferrals** — entry 41: deployment checklist in
    `11-access-security.md` (Upstash, XFF proxy, claim CAS, migrate).

Plus the **entry-44 code-review round** (3 reviewers, all FIX, all
fixed): settlement hardening, shareId-update fix, checkout
3DS-return/€0-degrade/retry, and the minors sweep (Retry-After, page
clamp, sitemap params).

---

## Round D — Parked / product backlog

- Mobile `FilterDrawer` (parked since entry 16).
- Postgres/Vercel deploy path (plan-level; dev-first until then).
- Lighthouse re-run after the checkout/analytics changes.

---

# Per-item plans

Format: **Outcome · Steps · Acceptance · Risk**. Gates for every item are the
standard set (tests → typecheck → lint → build → e2e when route/UI →
`workflow:check`); they are omitted below unless the item has a special gate.

## Round A — commit split (per item)

| Item | Steps | Acceptance | Risk |
|---|---|---|---|
| A1 workflow layer | stage `.devin/**`, `PROJECT_INDEX.md`, `CLAUDE.md`, `scripts/*.mjs`, `apps/web/package.json` | commit exists; `pnpm workflow:check` PASSED | `.devin/tracking/*.jsonl` is gitignored — verify not staged |
| A2 audit fixes | stage the audit-round source hunks (builder, drafts, CSV, seed, auth) | commit; tests green at that point | overlaps A3–A5 files → `git add -p` |
| A3 checkout | checkout page + `StripePaymentForm.tsx` + Stripe deps | commit; build green | depends on A2's `checkout/page.tsx` hunks |
| A4 discounts/shipping/tax | `pricing.ts`, 3 collections, endpoints, cart hook, patch hunk 2, seed | commit | same-file overlap with A5 (`index.ts`, `line-item-hooks.ts`) |
| A5 reservations | `reservations.ts`, collection, webhook integration, patch hunk 3 | commit | as A4 |
| A6 review fixes | conversion CAS, `discountCounted`, best-effort release, patch amount, `patches.test.ts` | commit | must land **after** A4/A5 (they fix them) |
| A7 funnel | analytics helpers + `ViewItemTracker` + call sites | commit | none |
| A8 docs | progress log, audit doc, 00-index, 15-delivery-phases, AGENTS.md, context files, this plan | commit | do last so tables reflect final state |

## Round B — live verifications (per item)

| Item | Steps | Acceptance |
|---|---|---|
| B1 Stripe e2e | set keys + `stripe listen --forward-to`; run a full checkout; then `stripe trigger payment_intent.succeeded` for the webhook leg | PI amount == `cart.total`; `usedCount` +1 exactly once; reservation `held → converted`; composite stock −1 once; replay no-op |
| B2 Resend live | set `RESEND_API_KEY`/`EMAIL_FROM`; trigger the 6 templates (order create, status→completed, welcome, contact, low-stock, reset) | each delivered; HTML escapes user input |
| B3 Postgres `migrate` | Docker Postgres or a URL; `payload migrate:create` then `migrate` | migration files apply cleanly on a fresh DB |
| B4 Sentry | DSN in `.env` + turbo allowlist; throw a test error | event captured; alert rule fires |
| B5 Plausible | domain in `.env`; load `/`, a product page, `/builder/configure`, advance a step | the 4 funnel events arrive |

## Round C — per item

1. **Checkout shipping address + country tax** — ✅ **done (entry 36, #241–251)**: cart `shippingCountry` + `POST /api/carts/:id/shipping-country` (owner-or-secret 404, ISO-2 validated, `''` clears), hook passes the country so the matching `tax-rates` row wins (unknown → `isDefault`); checkout address form (plugin `defaultAddressFields` shape) validated by `apps/web/src/lib/checkout.ts` `validateShippingAddress`, country set **before** `initiatePayment` (the charge uses the server-computed `cart.total`), address via `additionalData.shippingAddress` → PI metadata → order + confirmation email. Live-probed: 20% → DE 19% (`taxTotal` 9249 → 8861 on 55495). *Remaining nit*: the checkout leg still can't be e2e'd without Stripe keys (Round B1).
   *Original plan*: add `shippingCountry` to the cart (`cartTotalsFields`, readOnly) + pass `country` in `recomputeCartTotals`; extract `validateShippingAddress` to a lib with tests; checkout gains the address fields (plugin `defaultAddressFields` shape) → PATCH the cart's country → wait for the recompute → `initiatePayment({additionalData:{customerEmail, shippingAddress}})` (the adapter JSONs it into PI metadata; the webhook already reads it onto the order). *Acceptance*: unit tests for the validator + country-driven tax (#241+); live probe shows a `country`-matched rate; order carries `shippingAddress`. *Risk*: the charge must use the post-country total — set country **before** initiating; e2e stays keyless-blocked.
2. **`Shipments` (A18)** — ✅ **decision taken (entry 43)**: declared out of scope — status-only fulfilment via `orders.status` + the shipping email until a carrier/3PL need exists. Matrix row + register updated.
3. **Access-matrix deviations** — ✅ **resolved (entry 43)**: aligned to spec — `transactions` read → staff+ with writes admin-only (`transactionsAccess`, #272, live-probed); `addresses` read → staff-or-own (`staffOrOwnAddressRead`, #273, live-probed). Declared deviations (matrix updated): variant stock-write stays manager+, `customers` stays collapsed into `users`, `redirects` not built. The narrowing half (raw `inventory` → staff-only) was done in entry 42 (#269–271).
4. **Reservations at scale** — ✅ **done (entry 38, #255–257)**: `createReservationFromCart` supersedes the cart's previous held holds (double-initiate created two PIs → two live holds); `heldQuantities` takes the cart's SKU targets and filters `items.variant/product: { in: [...] }` so the read is bounded, with a loud warning if the page cap is still hit (`HELD_QUERY_LIMIT`); `status` indexed. Live-probed (holds 10/20 → caps 15/5). *Note*: a unique index on `paymentIntentID` was dropped from the plan — each initiation mints a new PI, so uniqueness there wouldn't catch the double-submit case the supersede now handles.
   *Original plan*: add a unique index on `paymentIntentID` (one hold per PI) + field-level `index: true` on `status`; replace the single `limit: 1000` read with a per-target aggregate query.
5. **Wishlist staleness** — ✅ **done (entry 40, #261–263)**: `POST /api/wishlist/check` (read-only, 20/min/IP) + `checkLiveProductIds` (published-only, deduped, cap 50) — `WishlistClient` marks unavailable items (dimmed, link removed) with a "Remove unavailable" action; a failed check leaves items untouched. Live-probed.
   *Original plan*: on `/wishlist` render, batch-check product existence/published (`where id in [...]`), mark missing items and offer removal; keep the cap and hydration gate.
6. **Seed fidelity** — done (entry 41, #264-268): case-fan slot category, 3rd template (Endurance Workstation), 20 ordinary products, customer user, 2 generated placeholder PNGs (every product gallery), product `attributeValues` (27 products/35 rows); data extracted to `seed-data.ts` with invariant tests; verified on a scratch DB (10 slot cats, 3 templates, 20 ordinary, 4 users, 2 media, 33 components, 53 products).
7. **Builder index size (A9)** — ✅ **done (entry 41, C7)**: 23,335 B raw / 2,924 B gzip at 33 components (707 B raw / 89 B gzip each) → ~345 KB raw / ~43 KB gzip at 500 components; the 300 KB budget is crossed near **~434 components uncompressed**. Fine at realistic scale read as gzipped — no trimming needed.
   *Original plan*: seed at scale (or synthesize 500+ components), hit `/api/builder/index`, measure gzip; if over, trim `display` payload fields.
8. **`derived-power-rules` uniqueness** — ✅ **done (entry 37, #252–254)**: `beforeValidate` singleton guard rejects a second doc with a clear 400 (the index honors `docs[0]` only), plus an index-builder warning for pre-guard/bypassed data. *Original plan*: decide singleton-vs-list; if singleton, add a `beforeValidate` guard + test; if list, make the engine iterate. Chose singleton (matches the seed and the index contract).
9. **Doc/alias trivia** — ✅ **done (entry 39)**: `/search → /shop/search` permanent redirect in `next.config.mjs` (live-verified 308 → 200); `BMR_PREVIEW_URL` removed from `12-integrations-ops.md` (code reads `BMR_URL` only); `builder-collections.md` shareId row → base64url randomBytes; same doc's rules row → staff read (deliberate). Login's missing IP limiter stays documented as spec-accepted.
   *Original plan*: `/search` → redirect (or alias) to `/shop/search`; delete/implement `BMR_PREVIEW_URL`; fix the `shareId` nanoid line and the rules "public read" line; keep the login-limiter note as spec-accepted.
10. **Prod-hardening deferrals** — done (entry 41, C10): 14-action `Deployment checklist` in `11-access-security.md` (prod secret guard, BMR_URL, Postgres migrate + transactions-before-keys, turbo env allowlists, proxy XFF overwrite, Upstash swap, claim CAS, webhook registration, reservations sweeper, Resend/Plausible keys, Sentry, OWASP payment re-pass), referenced from `12-integrations-ops.md`.

## Round C — decision briefs (C2, C3) — ✅ resolved (entry 43)

Decisions applied per best-practice (the widenings matched the spec exactly; the keeps are safe-direction). Recorded here for the audit trail:

**C2 — `Shipments` collection (matrix row 18).**
- *Spec*: `shipments` exists — public none, customer read own, staff/manager/admin write (carrier + tracking per order).
- *Decision*: **declared out of scope** — status-only fulfilment via `orders.status` + shipping email; no carrier/3PL integration exists to populate tracking yet. Revisit when a shipping integration lands. Matrix row + register updated.

**C3 — access-matrix deviations.** Spec vs impl; the *direction* mattered:

| # | Row | Spec | Was | Direction | Resolution |
| --- | --- | --- | --- | --- | --- |
| 1 | transactions | staff **read** | admin\|manager read | widen | ✅ **aligned to spec (entry 43)** — `transactionsAccess`: staff+ read, writes admin-only (refund). #272, live-probed (staff 200, manager create 403). |
| 2 | inventory counts | masked (boolean `inStock`) | raw counts public | **narrow** | ✅ **done (entry 42)** — `inventory` field pinned to staff+ read on products + variants (`maskInventoryRead`, #269–271); live-probed. |
| 3 | variants stock write | staff write | manager+ write | widen | ✅ **kept narrower (entry 43)** — stock edits are a manager action; staff fulfil orders. Matrix row updated. |
| 4 | addresses | staff **read** | no staff read (plugin default) | widen | ✅ **aligned to spec (entry 43)** — `staffOrOwnAddressRead`: staff+ read-all, customers own-only, anonymous none. #273, live-probed (staff 200, anon 403). |
| 5 | customers | own rows (staff read / manager write) | collapsed into `users` | structural | ✅ **kept collapsed (entry 43)** — plugin `customers.slug='users'` is the design; matrix row notes it. |
| 6 | redirects | collection | absent | feature | ✅ **out of scope (entry 43)** — until a URL-migration need; `/search` alias is a `next.config` redirect. Matrix row updated. |

---

## Round D — per item

- **FilterDrawer**: revive only with a mobile pass; needs the store's filter
  state extracted from `OptionsFilterBar` — separate round, UX-reviewed first.
- **Deploy path**: Postgres + Vercel; blocked on B3 + owner infra decisions.
- **Lighthouse re-run**: after A/B land; re-run home/`/shop`/`/builder` +
  `/checkout` and record in the progress log.
- **€0 checkout path** (entry 44): fully-discounted carts degrade to a
  "contact sales" notice because Stripe rejects €0 PaymentIntents — a
  proper fix needs a non-Stripe confirm path (create order, mark paid, no
  PI). Rare enough to stay a backlog item.

---

## Risks & gotchas the next chat must not rediscover

- **Adding a collection breaks drizzle push** (lock-rels rebuild) — pre-add
  `<slug>_id` to `payload_locked_documents_rels` (see `05-devops-gates.md`).
- **Local `pnpm build`/`e2e` need env exported**; turbo doesn't inject root
  `.env` into `next build`/`next start`.
- **Turbo-parallel vitest OOMs** → `--concurrency=1`.
- **Killed dev servers orphan `next` on :3000** → `taskkill`.
- **Payload local API `overrideAccess` defaults true** — internal writes are
  not access-blocked; don't "fix" them by adding explicit flags.
- **`patches/` carries 3 behaviours** (Stripe `cart.total`, composite-skip
  decrement, merge matcher) pinned by `patches.test.ts` — re-run
  `pnpm install` after any patch edit and keep the hunks in sync on plugin
  upgrades.

# 01 — Commerce: orders, payments, emails, cart

Canonical docs: `docs/buildmyrig-plan/04-collections/commerce.md`,
`08-api-surface.md`, `12-integrations-ops.md`. Plugin boundary:
`packages/plugin-shop` must NOT import the builder or `apps/web`
(eslint `no-restricted-imports` enforces — `pnpm lint`).

## Stripe / settlement

- `POST /api/payments/stripe/webhooks` exists **only when
  `STRIPE_SECRET_KEY` is set** — a 404 without keys is correct, not a bug.
- Handlers: `packages/plugin-shop/src/payments/stripe-webhooks.ts`
  (tests `#53–58`, `#198–199`, `#213–217`, `#230–240`, `#276–282` in
  `stripe-webhooks.test.ts`). Settlement is **CAS-idempotent** via a
  `pending → processing` claim on the transaction — replays are deduped.
  Do not settle order state anywhere else; whichever side wins the CAS
  (webhook or plugin-ecommerce confirm poll) creates the order row.
- **Shared settlement core (entry 57)**: `lib/settle-transaction.ts`
  holds `claimSettlement` (CAS + fencing token), `settleClaimedTransaction`
  (order create/reuse → `purchasedAt` → resumable decrement → discount →
  settle), `countDiscountUsage`, `postSettleSteps`. The webhook and
  `confirm-free` are thin callers; keep settlement logic there only.
- **Entry-44 settlement hardening**:
  - A claim lost to `processing` waits (4×250 ms re-check) and runs
    post-steps if the competitor landed; `processing` older than 60 s is
    **re-claimable** (dead settlement resumes instead of wedging).
  - **Fencing** (`settlementToken`, hidden field): the claim writes a
    token; every decrement line + the final settle CAS on it — a
    re-claimer stealing a still-alive worker makes the old worker abort
    instead of double-decrementing (#286, entry 45).
  - Settlement errors **rethrow** → route 500s → Stripe retries; the
    retry resumes via the stale-claim window, orphan-order reuse
    (`transactions contains tx.id`), and the `inventoryProgress` marker
    on the tx (the decrement loop restarts where it stopped);
    `inventoryComplete` records loop completion.
  - `charge.succeeded` also drives settlement (id resolved via
    `payment_intent`).
  - `discountCodeApplied` + `totalsSnapshot` are snapshotted onto the tx
    at create time (`lib/transaction-snapshot.ts` hook) — usage counting
    reads the snapshot, not a cart the shopper may have edited
    mid-payment; `maxUses` is enforced at increment time (conditional
    update).
- The `transactions` schema conditionally gains `paymentMethod` +
  `stripe` columns when an adapter exists — dev `push` self-heals on
  first key-ful boot; prod must migrate *before* setting keys.
- Inventory decrement lives in `lib/settle-transaction.ts` (entry 13/57)
  — do not add a second decrement path.
- **€0 checkout (entry 57)**: `POST /api/carts/:id/confirm-free`
  (10/min/IP, owner-or-secret → 404) settles fully-discounted carts
  without Stripe — requires server `cart.total <= 0` (422), non-empty
  cart, `collectBuildIssues` preflight. Once-only `purchasedAt` CAS on the
  cart is the idempotency gate: a lost claim re-finds the transaction for
  ~1 s (winner may still be creating it), then replays its `order`,
  resumes a pending one, or 409s when wedged. A failed transaction-create
  rolls the claim back via stamp-equality CAS (#394). Tx carries
  `paymentProvider:'free'`, `amount:0`; settlement key `free:<txId>`
  means no reservation is created or converted. Never trust a
  client-sent "free" flag — recompute is server-side only. The applied
  discount is **re-validated at confirm time** (SEC-001): `maxUses` is
  otherwise enforced only at apply time, and settlement's CAS stops the
  counter overshooting while still settling — pre-loaded carts could
  each land at €0. Skipped once `purchasedAt` is set (replay/resume).
- Discount `usedCount` increment lives in webhook settlement
  (`countDiscountUsage`): at-most-once via a **CAS on the transaction's
  `discountCounted` marker** (field added by `transactionsCollectionOverride`
  in `index.ts`), called from all three succeeded paths (claim, poll-wins
  early-return, repair) because the upstream `confirmOrder` poll settles
  without counting. Do not count usage in `confirmOrder` or order hooks.
- **Inventory reservations (entry 32)**: `inventory-reservations`
  collection; holds are created by the **wrapped** `initiatePayment`
  (`wrapWithReservations` in `lib/reservations.ts` — the adapter is
  wrapped in `index.ts`, no extra patch). Lifecycle: `held` →
  `converted` (settlement) | `released` (failed/canceled/expired) |
  `superseded` (cart re-initiated — still claimable for conversion so a
  late-settling PI doesn't miss its composite decrement; entry 40).
  Release never restocks; stock decrements only at settlement.
  - Webhook-wins settlement decrements everything then converts with
    `decrementComposite: false`; poll-wins (transaction already
    succeeded / repair path) converts with `decrementComposite: true`
    because the patched upstream poll only decremented standard lines.
  - Conversion **claims atomically first** (`db.updateOne` CAS on
    `status: held`) before any decrement — concurrent Stripe deliveries
    must not double-decrement. Keep that claim if you touch the function.
  - `failPaymentIntent` releases holds best-effort (try/catch) — a
    release hiccup must not 500 the webhook.
  - **One live hold per cart (C4)**: `createReservationFromCart` releases
    the cart's previous held holds first (double-submit creates a second
    PI), and `heldQuantities` scopes its read to the cart's own SKUs
    (`items.variant/product: { in: [...] }`) — the read stays bounded;
    hitting the page cap logs a warning (`HELD_QUERY_LIMIT`).
  - Availability = `inventory − activeHolds` (`heldQuantities`) inside
    `capQuantitiesToStock` — fail-open to raw inventory.
  - `decrementStock` pre-checks stock and logs an `oversell` error but
    still decrements (payment captured; accurate ledger). Do not add a
    second decrement path.
- Adapter internals (reference only): `packages/plugin-shop/node_modules/
  @payloadcms/plugin-ecommerce/dist/payments/adapters/stripe/`.
  **Patched** (`patches/`): `initiatePayment` charges `cart.total`
  (server-computed) with `subtotal` fallback; `mergeCartEndpoint` gets
  the composite matcher; `decrementInventory` (confirmOrder endpoint)
  **skips non-standard lines** instead of crashing — composite stock
  settles via reservation conversion. Keep the patch in sync on plugin
  upgrades.

## Catalogue attributes → facets + PDP compatibility (entry 64)

- **Model**: `attribute-types` (`slug` = the URL filter param, `name` =
  display, `valueType`, `unit`) → `attribute-values` (`value`,
  `displayLabel`) → `products.attributeValues[{attributeType, value}]`
  (array of relationships; depth 0 = ids, depth ≥1 = docs).
- **`apps/web/src/lib/facets.ts`** is the only reader: `buildFacets()`
  aggregates per-value counts and drops zero-count options/types;
  `facetSelection()` maps `?socket=AM5` → `{ active, where }` and ignores
  unregistered slugs/values. Category page spreads `where` into its
  `and` list; counts come from a second light query over the **non-facet**
  filtered set (a selected facet must not zero its own siblings).
- **Payload query trap**: `attributeValues.elemMatch` is rejected — use
  dotted subfield paths (`attributeValues.attributeType` /
  `attributeValues.value`). Equivalent because a value id belongs to one
  type (gotcha #41).
- **PDP**: `compatRows()` (`lib/specs.ts`) renders the same
  `attributeValues` as a Compatibility list + builder link; unresolved ids
  are skipped, never printed.
- **Seed/data**: `attributeTypeNames` in `seed-data.ts` supplies the
  display names (the seed used to write the raw slug). Existing DBs whose
  products predate the field need `node scripts/backfill-attributes.mjs`
  (idempotent, REST + seed defs; patched 21 products on the dev DB).

## Cart totals / discounts / shipping / tax (entry 31)

- One math source: `packages/plugin-shop/src/lib/pricing.ts`
  (`validateDiscount`, `pickShippingBand`, `computeCartTotals`).
  Prices are **VAT-inclusive**: `taxTotal` is the extracted portion
  `gross·rate/(100+rate)`, never added on top; shipping bands are picked
  on post-discount goods.
- The cart `beforeChange` recompute (`wrapCartBeforeChange` →
  `recomputeCartTotals`) runs on **every** cart write and is the only
  writer of `discountCode/discountTotal/shippingTotal/taxTotal/total`
  (all write-locked at field level). It **fails open** to zeroed totals
  with a warn — a totals hiccup must not break cart writes — and clears
  a discount code that no longer validates.
- Endpoints: `POST /api/discounts/validate` (stateless, 20/min/IP) and
  `POST /api/carts/:id/apply-discount` (owner-or-secret → 404; invalid
  code → 422 with the shared reason; writes only the relationship).
  Never compute totals in an endpoint — write the code, let the hook
  recompute.
- **Country-driven tax (entry 36, plan item C1)**: `POST
  /api/carts/:id/shipping-country` (owner-or-secret 404, ISO-3166
  alpha-2 validated, `''` clears) writes the cart's `shippingCountry`;
  the hook passes it to `computeCartTotals` so the matching `tax-rates`
  row wins (absent/unknown → `isDefault`). Checkout must set the country
  **before** `initiatePayment` — the adapter charges the server-computed
  `cart.total`. The address itself travels in
  `initiatePayment({additionalData:{shippingAddress}})` → PI metadata →
  order `shippingAddress` group (validate with
  `apps/web/src/lib/checkout.ts` `validateShippingAddress`).
- Stripe charges `cart.total` (patched `initiatePayment`); the checkout
  page renders the server fields, never client math.

## Packaging tiers (entry 71)

- `packaging-tiers` global (`packages/plugin-shop/src/globals/
  packaging-tiers.ts`): `tiers[] {name, badge, description, features[],
  priceCents, enabled}` — read public / update manager; resolver clamps
  and filters to enabled tiers.
- `POST /api/carts/:id/packaging {tier: number|null, secret?}`
  (owner-or-secret → 404, rate-limited like apply-discount) — server
  resolves the tier and price; `null` clears. Rejects on empty cart.
  Never trusts a client-supplied price.
- Packaging is a composite cart line `lineType: 'packaging'`
  (`lib/packaging.ts` `registerLineItemType` — `fulfillmentUnits: 0`,
  `resolveStockUnits: []`, consumes no inventory); qty clamped to 1 and
  deduped to one line per cart in `wrapCartBeforeChange`. `lineLabel`
  carries the display name — cart page/checkout/CartDrawer/order emails
  all fall back `lineLabel ?? …`.
- `PackagingPicker` sits on `/checkout` before payment so the tier lands
  inside the PaymentIntent total.

## Orders

- Real status enum is plugin-ecommerce's `OrderStatus`:
  `processing | completed | cancelled | refunded`. The plan's
  `pending → paid → fulfilled → shipped → delivered` select never
  existed — do not reintroduce it.
- Staff can flip `processing ↔ completed` only: collection `update`
  admits staff, but field access pins every field except `status` to
  manager+; `restrictStaffStatus` in
  `packages/plugin-shop/src/collections/orders.ts` is transition-aware —
  staff cannot un-cancel/un-refund, unchanged status is a no-op
  (tests `#128–130`, `#143`). Verify: staff tamper → 400/403.
- Customer read override (orders by owner **or** `customerEmail`) is in
  `packages/plugin-shop/src/index.ts`.

## Emails (Resend)

- Sender: `packages/plugin-shop/src/emails/resend.ts` — direct fetch to
  Resend `/emails`, `RESEND_API_KEY` + `EMAIL_FROM` required, **dry-run
  log when either is missing** (no SDK), `AbortSignal.timeout(5000)`,
  throws on non-2xx — callers decide policy.
- Templates: `emails/templates.ts` — inline HTML, **every interpolation
  `escapeHtml`-ed** (order fields carry customer input), `formatEur`
  cents→EUR with non-finite guard. Plain `{subject, html}` interface —
  react-email deliberately deferred.
- `orderEmailsAfterChange` (orders `afterChange`): create → confirmation;
  `processing → completed` → shipping; **never throws** — a down Resend
  must not break settlement or staff updates. Recipient resolution:
  guest `customerEmail` → `customer.email` → `findByID(users)`.
- Low-stock alerts: `emails/low-stock.ts` — fires crossing threshold
  6→≤5, gated on `STAFF_ALERT_EMAIL`, aggregates, never throws.
- Newsletter + contact share the same sender (`apps/web/src/lib/contact.ts`).

## Cart / checkout quirks (entry-23 review findings)

- Plugin cart query is `depth: 0` and populate is inert → line items need
  `EcommerceShell`'s `api.cartsFetchQuery {depth:1,
  populate.products.title}` or every title renders "Product".
- `useEcommerce().cartID` is **not provided** by the plugin's context —
  derive ids from `cart.id` / `localStorage('cart')`. Consumers:
  `components/EcommerceShell.tsx`, `app/(frontend)/{cart,checkout}/page.tsx`,
  `builder/summary/SummaryClient.tsx`.
- Guest checkout is intentional: `src/proxy.ts` guards `/account` only —
  **do not guard `/checkout`**.
- Guest email: the checkout collects a real `customerEmail` input (entry-20
  fix) — never hardcode one.
- Analytics: `track('Purchase')` fires client-side at checkout confirm;
  server-side `purchase` fires on order create via
  `analytics/order-purchase.ts` (skips cancelled/refunded).

## Verify

- `pnpm test` (plugin-shop suite covers webhooks/emails/orders access).
- Webhook e2e contract: signature reject, settle, replay-idempotency,
  refund, cleanup — needs a key-ful prod-build server.
- Rate limits on commerce POSTs: in-memory, IP-keyed — see 03.

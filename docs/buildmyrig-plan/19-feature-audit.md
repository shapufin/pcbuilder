# 19 · Feature Audit — implementation vs plan (entry 26+)

Ordered, feature-by-feature verification of what entries 1–24 built,
checked against `00-index.md` docs (09 routes, 04 collections,
08 api-surface, 06 rule engine, 15 DoDs) and assumptions A1–A20 in
`17-assumptions-backlog.md`. Per the workflow contract each pass =
read code vs spec → live probe → fix clear bugs inline (TDD) → record
findings here + progress-log entry.

Status legend: ⬜ pending · ✅ verified · 🐛 bug found+fixed ·
⚠️ deviation (works, needs decision) · 📋 missing/not built

## Pass 0 — Feature inventory ✅ (2026-10-01)

Route surface live-probed on `pnpm dev` (Next 16.3.8): all 09 rows
return expected codes — `/` `/shop` `/shop/search` `/builder*` `/cart`
`/checkout` `/wishlist` `/auth/*` `/about` `/contact` `/faq` `/terms`
`/privacy` `/sitemap.xml` `/robots.txt` `/icon.svg` → 200; `/account` →
307 (guard); `/shop/components`, unknown slug, `/build/nonexistent-share`
→ 404; `/builder/configure?template=bogus` → 200 (blank configurator, by
design). Inventory below = the audit checklist.

## Pass 1 — Storefront & catalog (context: 04-cms-pages-theme)

| # | Feature | Spec | Status | Notes |
| --- | --- | --- | --- | --- |
| S1 | All 09-routes rows render (no dead links) | 09 table + entry-16 `/shop` fix | 🐛 | `/build/[shareId]` existed on disk but `.gitignore` `build/` overmatched it → untracked, invisible to audits, never shipped. Fixed: `/build/` root-anchored; page verified live (200, `noindex`, slots+snapshot render). |
| S2 | Category facets: brand/socket/wattage/capacity/price, URL-sharable, sorting, pagination | 09 `/shop/[categorySlug]` row | ⚠️ | URL-sharable brand/price/sort/page ✅ + pagination 12/pg ✅. **Fixed inline**: brand list was a hardcoded slug literal → now queried from `brands` collection; added `title`/`newest` sorts; empty state got a Clear-filters CTA. **Gaps**: no spec facets (socket/wattage/capacity), no per-facet counts. Mobile FilterDrawer ✅ (shop entry 47; classic-builder OptionsFilterBar entry 59). |
| S3 | Product page: gallery, spec table, variant picker, stock badge, compatibility hint, add-to-cart | 09 `/product/[slug]` row | ⚠️ | ATC + breadcrumb + JSON-LD ✅; **fixed**: stock badge now real (variant `inventory`) and JSON-LD `availability` follows it (was hardcoded `InStock`). Gallery ✅ + multi-variant picker ✅ (entry 47 — original "gaps" were stale). Nested-`specsJson` `[object Object]` ✅ (entry 61, `specRows()`). RelatedProducts rail ✅ (entry 62). **Remaining gap**: compat hint is a stub link. |
| S4 | 14 blocks render from CMS incl. Section nesting + Lexical embeds | 10-blocks-pages | ✅ | 14 configs in plugin-pages, registry covers all, `blockReferences`+`filterOptions` enforced on pages/categories/section; function-form lexical converters; Faq emits `FAQPage` JSON-LD. |
| S5 | SEO: plugin-seo meta, JSON-LD, sitemap/robots/icon | 13-performance-seo, Phase 3 DoD | ⚠️ | **Fixed**: sitemap now try/catch → static entries on DB error (was unguarded 500); `metadataBase` added (relative OG URLs); page getters (`getPageBySlug`/`getHomepagePage`) now catch DB errors → null fallback. **Gaps**: plugin-seo wired on `pages` only (products have no editor SEO fields), no canonicals anywhere, no `revalidateTag` scheme at all. |
| S6 | Theme override live via `#theme-vars`; ISR propagation | 04 context / entry 21 | ✅ | `getThemeCss`/`getSiteSettings` both try/catch→defaults; `<style id="theme-vars">` first body child; ISR re-verify probed. |
| S7 | site-settings drives header/footer nav | entry 18 | ✅ | header `navLinks` + `SiteFooter` `footerLinks` consume the global; `isSafeNavLinkUrl` guard. |
| S8 | 404/500: `not-found.tsx` + `error.tsx` (Sentry widget) | 09 §404/500 | 🐛 | Neither existed → **built**: `not-found.tsx` (search CTA + live category links, DB-fail safe), `error.tsx` (retry + home; no Sentry — DSN parked, degrades per spec). |

### Pass-1 extra findings (subagent static audit + live probes)

- 🐛 **Build-IDOR closed**: `/builder/configure?build=` used `findByID` on the
  numeric PK → enumerable. Now resolves by `shareId` only (the public
  capability token); numeric ids no longer hydrate. Share page links
  `?build=<shareId>` accordingly.
- 📋 `/product/[slug]` has **no ISR/`generateStaticParams`** — fully dynamic
  per request; spec wants ISR top-500 + `revalidateTag('product:<id>')`.
- 📋 Spec facets (`attribute-types`/`attribute-values` exist in plugin-shop but
  are never read) and facet counts unbuilt — feature-sized, see gap register.
- 📋 Product gallery: `gallery` upload field + media `gallery` imageSize exist;
  no storefront component renders an image anywhere (product page, shop cards,
  wishlist all text-only).
- ⚠️ `configure?build=<shareId>` etc. return 200 with an empty configurator on
  unknown refs — consistent with `?template=bogus`; acceptable.
- Doc debt: `09-routes.md:31` + `07-ux-plan.md` claimed `/build/[shareId]`
  live while git-invisible; `13:17` claims `revalidateTag` hooks that don't
  exist. Corrected in this round's doc updates.

## Pass 2 — Commerce (context: 01-commerce)

| # | Feature | Spec | Status | Notes |
| --- | --- | --- | --- | --- |
| C1 | Collections exist per 04 | 04-collections/* | ✅ | products/variants/categories/brands/attributes(+values)/media/carts/orders/transactions/addresses all present; `customers` role is on `users` (no separate collection — doc drift vs `commerce.md`). |
| C2 | Guest + user cart, **merge on login** (sums, stock-capped, A10) | Phase 1 DoD, A10 | ⚠️ | Merge **exists** — plugin client `onLogin()` → `POST /api/carts/:id/merge` (wired in Login/Register/Reset forms), quantities summed. **Gaps**: no stock cap on merge (A10 partial). **🐛 fixed**: merge endpoint was registered without `cartItemMatcher` → all composite lines collided (product+variant both null) and guest builds were silently dropped — patched via `pnpm patch` on `plugin-ecommerce@3.90.2` (wires `cartItemMatcher` into `mergeCartEndpoint`) + matcher now normalizes populated-object ids (#188). |
| C3 | Discount codes (single, A6) | Phase 1 DoD e2e leg, A6 | 📋 | Collection exists (code/type/value/maxUses/usedCount/minSubtotal/dates/enabled, staff-read/manager-write) but **no apply path**: no `/api/discounts/validate`, no `discountCode` on carts/orders, no checkout application, no `usedCount` increment. **� fixed**: `usedCount` field-access was `Boolean(req.user)` — any customer could exhaust a code; now manager+. |
| C4 | Shipping flat bands (A18) | A18 | 📋 | No shipping cost logic anywhere; `Shipments` collection absent entirely. |
| C5 | Tax static table (A19) | A19 | 📋 | No tax computation; `06-rule-engine.md`'s "+ tax" formula and `commerce.md`'s `taxTotal` are doc-only. |
| C6 | Inventory: stock per variant, decrement on settle, reservations, low-stock alert | 04/pricing-inventory | ⚠️ | Decrement-on-settle ✅ + low-stock alert ✅; **🐛 fixed**: settlement crashed on composite lines (`product:null,variant:null` → throw after order created → transaction stuck `processing` forever). New `resolveStockUnits` contract on `LineItemType`; pc-builder resolves each component's `productVariant`; webhook delegates (#186/187). **Gaps**: no reservations/holds, `$inc` can go negative, no `payment_intent.canceled` release, `initiatePayment` doesn't stock-check composite subItems, plugin's own `confirmOrder` decrement path still crashes on composite lines (unpatched upstream file — CAS race means the webhook usually wins; recorded as gap). |
| C7 | Checkout: initiatePayment→confirmOrder inline, guest OK | 08/09 + entry-20 fix | ✅ | **Fixed (entry 30)**: embedded Payment Element flow now runs `initiatePayment` → `clientSecret` → `confirmPayment(redirect:'if_required')` → `confirmOrder(paymentIntentID)` → CAS webhook settle. Pending: live verification needs Stripe keys. Plan docs describe hosted Checkout (stale — actual adapter is PaymentIntent/embedded). |
| C8 | Webhook settlement: signature, CAS idempotent, refund, cleanup | entry 13, e2e 14/14 | ✅ | All paths covered by #53–58 + new #186/187. Caveat: `STRIPE_SECRET_KEY` set + `STRIPE_WEBHOOK_SECRET` unset → silent 200-ACK without processing. |
| C9 | Order emails: create→confirmation, processing→completed→shipping, never-throws, escaping | entry 20 | ✅ | Verified — recipient chain guest→customer→users lookup, all interpolations escaped, never-throws. |
| C10 | Access: orders owner-or-email read; staff status-only write incl. terminal guard | entries 14/20/21 | ✅ | Verified incl. `restrictStaffStatus` transition guards. |
| C11 | `/api/carts/:id/add-build` + `/api/carts/:id/validate` | 09 rows 21–22 | ✅ | **Live-probed**: `add-build` with secret → composite line + server subtotal `186200`; `validate` → `{ok:true,checked:1}`; wrong secret → 404 "cart not found" (no leak). Limiters 30/min + 20/min IP. |

## Pass 3 — Builder (context: 02-builder)

| # | Feature | Spec | Status | Notes |
| --- | --- | --- | --- | --- |
| B1 | Rule engine: 4 types, operators, bidirectional mirror, A8 missing-spec pass, severity, interpolation | 06 spec | ✅ | All 4 rule types + derived power verified; A8 asymmetric skip in both paths; O(n) precompiled sets. **🐛 fixed**: `{socketA}`/`{socketB}` tokens (documented in 04 + admin hint) resolved to literals — now `{<field>A}`/`{<field>B}` map to each side's spec value (#189). |
| B2 | DerivedPowerRule: `(Σtdp)×1.3+100`, admin-editable (A7) | 04/compatibility | ✅ | `derived-power-rules` collection, admin-editable multiplier/base/severity; index bridges with plugin defaults → hardcoded fallback. 📋 Only `docs[0]` honored if multiple docs exist (no uniqueness constraint). |
| B3 | Collections per spec | 04/builder-collections | ✅ | All fields verified. **Fixed**: `configured-builds` now generates `shareId` in beforeChange when missing (staff-created builds get share links), and `shareId`/`status`/`priceSnapshot`/`validationSnapshot`/`user` carry real field-level `access.update:false` — `admin.readOnly` was UI-only and owner PATCH could spoof them. 📋 Doc drift: spec says rules "public read", impl is staff-read (deliberate; doc stale). Spec'd `afterChange` share-cache invalidation hook absent — moot after B7's `force-dynamic`. |
| B4 | Builder index: 30 s cache, rulesVersion, invalidation | entry 14 | ✅ | TTL + inflight dedup + composite rulesVersion + afterChange/Delete hooks on all 4 collections. **Fixed**: `inStock` was hardcoded `true` — now real (`productVariant.inventory > 0` when populated; missing variant data stays `true` so unpriced drafts aren't hidden). 📋 A9 ≤300KB unverifiable statically — `display` payload grew past the spec estimate; measure gzip at scale. |
| B5 | Endpoints: use-template, claim, share, stats, CSV import, stock, conflicts | 08 + entries 14/15 | ✅ | All probed/tested. **Fixed**: (a) `GET /builder/rules/conflicts` had **no auth** — now staff-gated 401 (#197); (b) use-template bumped `popularity` *before* create so a 422 still counted — now after (#194); (c) `findByID` `disableErrors` restored the dead 404 branch; (d) `/builder/stock/:categoryId` now filters `inStock` from the cached index (was top-5 regardless of stock/compat). |
| B6 | Admin: RuleManagerView, BuildStatsView, ConflictsField, products↔builder tab | Phase 2c | ⚠️ | All views present (inline edit, add/duplicate, enabled toggle, preview-diff, stats cards, live conflicts, products tab). **Fixed — bigger than reported**: CSV export wrote the target *name* into the `targetType` column → every exported row failed zod enum on re-import (round-trip was entirely broken, not just lossy); now emits real `targetType` + `bidirectional`/`enabled` columns, schema accepts them, commit honors them. ⚠️ Remaining: CSV import path is JSON `{rows}` (not multipart) — works via UI; fine. |
| B7 | UI: guided → steps → filtering/warnings/power → summary → share/claim/add-to-cart; draft resume | Phase 2d/2e | ✅ | All present. **🐛 fixed — user-facing**: `?build=` resume read `slot.component` (singular) on configured-builds' `components[]` → every "Duplicate this build" produced an **empty configurator and wiped the visitor's localStorage draft**. Now expands `components[]` correctly; live-verified — `?build=z0GuiXNBUOUXm1ob` hydrates all 8 slots. **Fixed**: `/build/[shareId]` had no `dynamic`/`revalidate` — was Full-Route-Cacheable forever (stale prices, pinned 404s) → `force-dynamic`. |
| B8 | Server recomputes price; rejects tampered/incomplete builds | Phase 2 DoD | ✅ | `beforeChange` re-validates + reprices from live index; cart path re-resolves. **Fixed — orderability hole**: nothing enforced `category.required`/`maxSelectable` server-side — an OS-only "build" was orderable. New `findIncompleteSlotReasons` runs in the save endpoint, collection hook, and cart `resolveLine` (#190–193). |

## Pass 4 — Auth & security (context: 03-security-access)

| # | Feature | Spec | Status | Notes |
| --- | --- | --- | --- | --- |
| A1 | register/login/forgot/reset full flow incl. anti-enumeration + cookie mint | entries 15/23 | ✅ | Live-probed: forgot returns byte-identical `{ok:true}` for known/unknown emails; reset is payload-token contract (single-use, 1 h, session revoke, lockout clear); register pins `roles:['customer']`, zod, origin gate, 5/min/IP, generic 500. Register dup → 409 is the spec-accepted VERIFY-002 tradeoff. 📋 Login has no IP limiter — spec relies on `maxLoginAttempts:5`/10 min lockout. |
| A2 | `/account`: orders owner-or-email + saved builds; proxy guard; checkout unguarded | entry 15 | ✅ | Live-probed: anon `/account` → 307 `/auth/login?next=%2Faccount`; page re-validates `payload.auth` server-side; `?next` open-redirect sanitized. |
| A3 | Access matrix: 11 collections + Users escalation pin + media + configured-builds | entries 11/14/42/43 | ✅ | Verified (Users roles admin-only write, orders owner-or-email + staff status-only + transition guards, media staff+, configured-builds owner+serverManaged fields). **🐛 fixed — draft leak**: `categories` + `build-templates` had `versions.drafts:true` with `read: () => true` → anonymous `?draft=true` exposed unpublished docs; now staff/all + public/published-only (Pages pattern). Seed never published categories → fixed seed + backfilled dev DB. **Deviations all resolved (entries 42–43)**: raw `inventory` masked to staff+ (boolean `inStock` remains public); transactions staff-read + admin-only writes; addresses staff-read-or-owner; variant stock-write stays manager+ (matrix updated); `customers`→users collapse + `redirects`/`Shipments` declared out of scope. |
| A4 | CSRF Origin allowlist incl. GET behavior | entry 11 | ✅ | `BMR_URL` (trailing-slash normalized) + localhost; applies to cookie-auth'd GETs (documented gotcha); wired consistently. |
| A5 | Rate limits: register/reset/contact/newsletter 5/min, validate 20/min; maxLoginAttempts 5 | 11-access-security | ✅ | All limits verified: register/forgot/reset/contact/newsletter 5/min/IP, cart-validate 20/min, add-build + builder endpoints 30/min, `maxLoginAttempts:5`. **Fixed**: newsletter lacked the Origin gate its 4 siblings share — added (shared `defaultAllowedOrigins` from auth.ts; contact.ts dedup'd onto it). 📋 In-memory single-instance limiter + leftmost-XFF trust = documented VULN-01, needs XFF-overwriting proxy in prod. |
| A6 | Error hygiene: no internal leaks; SVG ban; XFF contract | entries 11/15 | ✅ | Register/forgot/reset generics; zod leaks only field names; media mime whitelist jpeg/png/webp/avif; no secrets in responses. **Fixed**: `PAYLOAD_SECRET`/`DATABASE_URI` had silent literal fallbacks with no prod check — now throws when `NODE_ENV=production` and secret is the placeholder. |

## Pass 5 — Cross-cutting (context: 05-devops-gates + 06-gotchas)

| # | Feature | Spec | Status | Notes |
| --- | --- | --- | --- | --- |
| X1 | Search (`contains`, sanitize) + wishlist (cap 50, hydration gate) | entry 18 | ✅ | `/shop/search` live-probed 200; `sanitizeSearchQuery` strips LIKE wildcards/control chars, parameterized `contains` on title/description, published-only. Wishlist: cap 50 (dedupe + oldest evicted), `skipHydration` + explicit rehydrate. 📋 Wishlist renders snapshots — no check the product still exists (stale title/price/404 link possible). |
| X2 | Newsletter + contact + all 6 email templates | entries 20/23 | ✅ | Shared Resend sender, dry-run without keys, origin gate + 5/min limiter on both (newsletter gate added in Pass 4). All 6 templates verified: order confirmation, shipped, welcome, contact, low-stock, password-reset. |
| X3 | Analytics: client `track()` + server `purchase`; Plausible gating | entries 14/23 | ⚠️ | Script gated on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`; `track()` no-ops safely, no PII; server `purchase` on order create skips cancelled/refunded. 📋 Spec events `view_item`/`begin_builder`/`build_step_completed` never fired — funnel coverage partial. |
| X4 | Animations: motion.ts dialog/drawer, reduced-motion | entry 23 | ✅ | `dialogMotion`/`drawerMotion` + `prefers-reduced-motion` respected; CartDrawer + guided dialog wired. |
| X5 | Legal pages + footer; favicon; a11y | entries 14/17 | ✅ | `/privacy` `/terms` `/about` `/faq` `/contact` seeded+published, footer from site-settings, `icon.svg` favicon, `lang`, labels, alt text. **Fixed**: added skip-to-content link (was absent). Caveat: legal pages 404 on unseeded DB. |
| X6 | Seed fidelity: counts + idempotency | entry 1..24 | ⚠️ | Counts verified: 31 builder components / 42 rules / 34 products / 2 templates / 11 categories / 7 brands — matches prior entries. **Fixed**: `seed.ts` now skips cleanly when users exist (was unique-constraint crash); categories now seeded `published` (Pass 4 fix made this load-bearing). 📋 Spec drift documented in 14-seeds: spec wants 10 slot categories (9), 3 templates (2), 20 ordinary products (3), 4 users (3 — no customer), seeded media (none), product attributeValues (never populated). Doc's "idempotent upserts / `--drop` / `PAYLOAD_SEED`" claims corrected — none implemented. |
| X7 | `.env.example` vs turbo env allowlists | 05 context | ✅ | Every code-referenced var present; turbo `dev`/`build` allowlists sufficient. **Fixed**: S3/Upstash/Sentry rows labeled "planned, NOT wired" (were ambiguous placeholders). 📋 Docs mention `BMR_PREVIEW_URL` — never read in code. |
| X8 | `admin-training.md` vs real admin surfaces | entry 12 doc | ✅ | Role matrix, 14 blocks, homepage flag, media whitelist, rate limits all verified accurate. **Fixed**: two stale claims — footer newsletter (actually homepage block) and staff CSV import (actually manager+). |

## Consolidated gap register

### Blocking (feature-sized, needs a dedicated round)

Checkout is wired as of entry 30 — remaining: live verify with real Stripe keys. Discounts/shipping/tax wired as of entry 31; reservations/merge-caps/confirmOrder-crash closed as of entry 32 — **all 7 blocking gaps closed**; remaining: owner-keyed live verifications (Stripe e2e, Resend live send).

| Gap | Found | Detail |
| --- | --- | --- |
| ~~Checkout can never complete~~ | P2-C7 | **Wired (entry 30)**: embedded Payment Element flow — `initiatePayment` → `clientSecret` → `<Elements>`+`PaymentElement` → `confirmPayment(redirect:'if_required')` → PI `succeeded` → `confirmOrder(paymentIntentID)` → CAS webhook settles. Deps `@stripe/react-stripe-js@6.12.0` + `@stripe/stripe-js@9.17.0` (v7/10 released same-day — held to 7-day vetting rule). Remaining: live verification needs Stripe keys. |
| ~~Discount apply path absent~~ | P2-C3 | **Wired (entry 31)**: `POST /api/discounts/validate` (stateless pre-check) + `POST /api/carts/:id/apply-discount` (owner-or-secret); carts carry `discountCode` + server-computed `discountTotal/shippingTotal/taxTotal/total` recomputed on every cart write; `usedCount` increments atomically in webhook settlement (A6). Live-probed end-to-end. |
| ~~Shipping bands absent~~ | P2-C4 | **Wired (entry 31)**: `shipping-bands` collection (staff read/manager write) + `pickShippingBand` on post-discount goods; `shippingTotal` server-computed. **Shipments (A18 fulfilment tracking): declared out of scope (entry 43 decision)** — status-only fulfilment via `orders.status` + shipping email until a carrier/3PL need exists. |
| ~~Tax absent~~ | P2-C5 | **Wired (entry 31)**: `tax-rates` static table (A19), VAT-inclusive extraction `gross·rate/(100+rate)`; `isDefault` row applies until checkout collects a shipping country. |
| ~~Inventory reservations absent~~ | P2-C6 | **Wired (entry 32)**: `inventory-reservations` holds at payment initiation (wrapped `initiatePayment`), release on failed/canceled/expired, conversion at settlement (composite-only on poll-wins); availability = inventory − active holds in `capQuantitiesToStock`; settlement decrement guarded with loud oversell log. |
| ~~Cart-merge stock caps~~ | P2-C2 | **Closed (entry 32, proven)**: `capQuantitiesToStock` runs on merge writes (cart `beforeChange`) — test #211 proves merged over-stock quantities cap to `inventory − holds`. |
| ~~Plugin `confirmOrder` decrement crash on composite lines~~ | P2-C6 | **Fixed (entry 32)**: patched upstream `decrementInventory` skips non-standard lines (was a hard crash after order creation); composite stock settles via reservation conversion in the webhook. |

### Minor (documented, safe-direction, or cosmetic)

| Gap | Found | Detail |
| --- | --- | --- |
| ~~Multiple `derived-power-rules` docs → only first honored~~ | P3-B2 | **Fixed (entry 37)**: `beforeValidate` singleton guard on create (clear 400) + a loud index-builder warning for pre-guard data (#252–254). |
| ~~Index ≤300KB (A9) unverifiable statically~~ | P3-B4 | **Measured (entry 41, C7)**: 23,335 B raw / 2,924 B gzip at 33 components (707 B raw each) → ~345 KB raw / ~43 KB gzip at 500 components; the 300 KB budget is crossed near ~434 components *uncompressed*. Fine at realistic scale when the budget is read as gzipped. |
| ~~`shareId` spec says nanoid, impl is base64url randomBytes~~ | P3-B3 | **Doc fixed (entry 39)**: `04-collections/builder-collections.md` now states base64url randomBytes (96-bit, equivalent entropy). |
| ~~Rules read is staff-only vs "public" in spec doc~~ | P3-B3 | **Doc fixed (entry 39)**: `04-collections/builder-collections.md` now says staff read (deliberate — the builder index endpoint is the public surface). |
| ~~Transactions admin\|manager-only vs matrix staff-read~~ | P4-A3 | **Resolved (entry 43, decision)**: aligned to spec — staff+ read, writes admin-only (refund). `transactionsAccess`, #272. Live-probed (staff 200, manager write 403). |
| ~~Public reads raw `inventory` counts~~ | P4-A3 | **Fixed (entry 42)**: `inventory` field pinned to staff+ read on products + variants (`maskInventoryRead`, #269–271); public keeps the `inStock` boolean via the product view. Live-probed. |
| ~~Variant stock-write manager+ not staff~~ | P4-A3 | **Decision (entry 43)**: kept manager+ (stock edits are a manager action; staff fulfil orders). Matrix row updated. |
| ~~`customers`→users collapses matrix rows~~ | P4-A3 | **Decision (entry 43)**: kept collapsed (plugin `customers.slug='users'` is the design); matrix row notes the collapse. |
| ~~Addresses staff-read missing~~ | P4-A3 | **Resolved (entry 43, decision)**: aligned to spec — `staffOrOwnAddressRead` grants staff+ read-all, customers own-only. #273. Live-probed. |
| ~~`redirects` collection absent~~ | P4-A3 | **Decision (entry 43)**: out of scope until a URL-migration need; `/search` alias is a `next.config` redirect. Matrix row updated. |
| ~~Login has no IP limiter~~ | P4-A1 | Spec-accepted; lockout is the boundary. |
| Claim TOCTOU (VERIFY-001), XFF spoof (VULN-01) | P4 | Documented deferrals — prod-only by design (claim CAS + XFF proxy steps are in the deployment checklist, `11-access-security.md`). |
| ~~Wishlist stale snapshot render~~ | P5-X1 | **Fixed (entry 40)**: `POST /api/wishlist/check` + `checkLiveProductIds` (published-only, deduped, cap 50) — stale items are marked unavailable with a "Remove unavailable" action (#261–263). |
| ~~Analytics funnel events missing~~ | P5-X3 | **Wired (entry 34)**: `view_item` (product-page client island), `begin_builder` (once per configurator session), `build_step_completed` (on step advance) — helpers in `apps/web/src/lib/analytics.ts`, all gated on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (#236–239). |
| ~~Seed undershoot vs spec table~~ | P5-X6 | **Fixed (entry 41, C6)**: case-fan slot category, 3rd template, 20 ordinary products, customer user, 2 placeholder media, product `attributeValues` — verified on a scratch DB; data extracted to `seed-data.ts` with invariant tests (#264–268). |
| ~~`BMR_PREVIEW_URL` documented but unread~~ | P5-X7 | **Doc fixed (entry 39)**: removed from the env list in `12-integrations-ops.md` — code reads `BMR_URL` only. |
| ~~`/search` convenience alias absent~~ | P5-X1 | **Wired (entry 39)**: `next.config.mjs` permanent redirect `/search → /shop/search`. |

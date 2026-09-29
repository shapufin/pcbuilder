# 04 · Collections — Products & Variants

## Two paths, recommendation

**Path A (recommended): official `@payloadcms/plugin-ecommerce` as base.**
The plugin ships Products with Variants, Carts (guest + user, created on first add, cart item endpoints `POST /api/carts/:cartID/add-item|update-item|remove-item`), Orders, Transactions, Addresses, Customers, a payments adapter pattern (Stripe currently supported), and multi-currency support (https://payloadcms.com/docs/ecommerce/overview). Collections are customizable — advanced uses show creating our own collection variants via factory functions like `createAddressesCollection` with custom access and extra fields (https://payloadcms.com/docs/ecommerce/advanced). Source confirms order-confirmation validation hooks exist (`confirmOrder.ts` in `packages/plugin-ecommerce/src/endpoints`).

**Path B (fallback): own minimal equivalents.** Products, Variants, Carts, Orders, Transactions, Addresses as our own collections in `plugin-shop` with the same shapes as below. Trigger for switching: audit spike (Phase 0) finds blocking gaps — e.g. missing composite line items, insufficient order-status flexibility, or no guest-cart-merge hook.

**Audit spike (Phase 0, timeboxed 3 days):** evaluate plugin maturity on these criteria — composite line items (needed for ConfiguredBuild), guest→user cart merge on login, inventory decrement hook, order status machine, payment adapter extension, REST/local API coverage, current version stability (check GitHub issues). Decision recorded in `docs/buildmyrig-plan/04-collections/products.md` decision log.

## Products

Purpose: purchasable item, parent of variants (a GPU product may have variants for SKUs; most PC parts = 1 variant). When ecommerce plugin is the base, we extend via its collection factory options.

| Field | Type | Notes |
| --- | --- | --- |
| title | text | required |
| slug | text (unique, indexed) | used in `/product/[slug]` |
| description | textarea | plain |
| marketingCopy | richtext | display |
| gallery | upload rel → media (array) | images with Payload sizes |
| category | rel → categories (indexed) | primary facet |
| brand | rel → brands (indexed) | primary facet |
| attributeValues | array { attributeType rel, value rel } | powers faceted filters |
| specsJson | json | cosmetic specs (display + filterable keys whitelisted) |
| isComponent | checkbox (read-only, set by plugin-pc-builder) | links to builder |
| component | rel → components (1:1, read-only, admin-only visibility) | set by builder plugin |
| reviewsEnabled | checkbox | Phase 2 |
| status | draft/published via versions | drafts enabled |
| seo | seo field (`@payloadcms/plugin-seo`) | title, description, image |

Access: public read (published only), admin/manager write. Hooks: `afterChange` → revalidate `/product/[slug]` + `/shop/[categorySlug]` via Next.js cache tag; `beforeChange` → slug uniqueness + price sanity.

> **Status (2026-09-28)**: `isComponent` + `component` are live (progress-log entry 10). plugin-pc-builder injects a **Builder** tab into the shop products collection at config time (`withBuilderTab` — TDD: append/idempotent/admin-only `component` field access). `Components.afterChange`/`afterDelete` sync the link from the variant side (component → variant → product; stale links cleared; best-effort so component saves never block). Backfill for pre-existing DBs: `pnpm --filter @buildmyrig/web backfill:links` (31/31 linked on dev). Storefront: `isComponent` is public (product page shows the "Available in the PC Builder" CTA), `component` is admin-only via field-level access.

## ProductVariants

| Field | Type | Notes |
| --- | --- | --- |
| product | rel → products (indexed) | |
| sku | text unique | |
| options | array of { attributeType rel, attributeValue rel } | e.g. Size/Color or "DDR5/32GB" |
| price | rel → prices (array, indexed) | per-currency resolution |
| inventory | rel → inventory | lowStockThreshold, quantity |
| publishStatus | draft/published | |

Access: public read, staff write (stock updates). Hooks: `afterChange` → invalidate price resolution cache; low-stock check → emit `shop:low-stock` event → staff email.

Decision log
- A1: Components bind to a **variant** (not product) because price/inventory/SKU all resolve at variant granularity; component display fields (specs, marketing) stay on the Product. See [builder-collections.md](builder-collections.md).

# 05 · Plugin Contracts

Plugin API per https://payloadcms.com/docs/plugins/build-your-own: `(pluginOptions) => (incomingConfig: Config) => Config`, spread `config.collections` / `config.globals` / `config.endpoints`, chain `config.onInit`, typed options with JSDoc, and `CollectionSlug` / `DataFromCollectionSlug` generic helpers for referencing user collections (https://payloadcms.com/docs/typescript/overview#type-helpers).

## plugin-shop

```typescript
export interface ShopPluginOptions {
  enabled?: boolean                       // default true
  customersSlug?: CollectionSlug          // default 'customers'
  productsSlug?: CollectionSlug           // default 'products'
  variantsSlug?: CollectionSlug           // default 'variants'
  currencies?: string[]                   // default ['EUR']
  paymentAdapter?: PaymentAdapter         // injected; plugin never imports Stripe
  orderNumberPrefix?: string              // default 'BMR'
  reserveTimeoutMinutes?: number          // default 15
  onOrderPaid?: (order: DataFromCollectionSlug<'orders'>, payload: Payload) => Promise<void>   // extension hook
  onOrderShipped?: (order: unknown, payload: Payload) => Promise<void>
}
```

**Line-item extension registry (the shop ↔ builder integration point)**

```typescript
export interface LineItemType {
  slug: string                                     // e.g. 'configured-build'
  label: string
  // called when the server recomputes cart/order totals; resolves sub-items + price
  resolveLine: (line: unknown, payload: Payload) => Promise<ResolvedLine>   // { price, subItems: [{ variantOrComponent, quantity }], fulfillmentUnits: number }
  // called at fulfillment; how staff picks this line (by variant or by components)
  fulfillmentPickUnits?: (line: unknown) => FulfillmentUnit[]
}
export function registerLineItemType(type: LineItemType): void   // config-time call by plugin-pc-builder
```

**Collections added** (or inherited from ecommerce plugin when the audit spike picks it): carts, orders, transactions, shipments, addresses, customers, discountCodes, prices, inventory.
**Endpoints added**: cart item endpoints (plugin-provided), `POST /api/discounts/validate`, `POST /api/checkout`, `POST /api/stripe/webhook` (registered by the injected payment adapter, not core).
**Hooks added**: price resolution cache, inventory reservation/decrement, discount re-validation, order lifecycle emails, `afterLogin` guest-cart merge.
**Admin components**: order status badge columns, discount usage column.
**Events emitted (server event bus, simple typed emitter in packages/lib)**: `shop:order-paid`, `shop:order-shipped`, `shop:low-stock`, `shop:stock-changed`, `shop:cart-merged`.

## plugin-pc-builder

```typescript
export interface PcBuilderPluginOptions {
  enabled?: boolean                       // default true
  variantsSlug?: CollectionSlug           // default 'variants' — soft reference, no import of shop
  mediaSlug?: CollectionSlug              // default 'media'
  ruleIndexesCache?: { revalidateSeconds?: number }   // default revalidate 30
  powerDefaults?: { overheadMultiplier?: number; baseWatts?: number }  // default 1.3 / 100 — wired 2026-09-28 (setPowerDefaults at config time; rule-doc values take precedence)
  clientIndexMaxBytes?: number            // default 314_572 (300KB) — page splits index if exceeded
  onBuildAddedToCart?: (build: unknown, payload: Payload) => Promise<void>
}
```

**Collections added**: componentCategories, components, compatibilityRules, derivedPowerRules, buildTemplates, configuredBuilds.
**Endpoints added** (all zod-validated): see [../08-api-surface.md](../08-api-surface.md) — rule evaluation, index fetch, conflicts lookup, build save/share, CSV import/export.
**Hooks added**: component `afterChange` spec-index rebuild + products `isComponent`/`component` link sync (and `afterDelete` cleanup — entry 10); compatibilityRule `afterChange` rulesVersion bump; configuredBuild `beforeChange` server validation + price snapshot; buildTemplates `beforeChange` `basePrice` recompute (Σ slot variant `priceInEUR`, entry 10) + `afterChange`/`afterDelete` revalidation of `/` + `/builder`.
**Admin components injected**: custom view "Compatibility Rules" (grid + CSV import/export, `components.views`; sidebar link via `components.afterNavLinks` — entry 10); custom field on Component edit "Conflicts" (live conflict table, `components.fields`); Builder tab on the shop products collection (`isComponent` + `component`, entry 10); custom view "Build Stats" (popular templates, completed builds count, `components.views` — done entry 14: `/admin/build-stats`, staff+ `GET /api/builder/stats`).
**Events consumed**: `shop:low-stock` → flags affected components in admin "Build Stats" (read-only stats, no shop import).
**Events emitted**: `builder:rules-version` (cache invalidation), `builder:build-completed` (analytics).

## plugin-pages

**Package**: `packages/plugin-pages` (`@buildmyrig/plugin-pages`) — created entry 19 (Phase 5 Step B) to consolidate page/settings wiring out of the app.

**Globals added**: `site-settings` (nav/footer link arrays; `update: isManager`; URL `validate` mirrors the renderer rule) + `theme` (dark/light preset + colors/radius/fonts; `update: isManager` — entry 21).
**Collections patched**: `categories` gains the bounded `topBlocks` zone (`blocks: []` + `blockReferences: hero|ctaBanner` + `filterOptions` — entry 22); `pages` gains `seo.*` (wraps `@payloadcms/plugin-seo` and renames its hardcoded `meta` group — the plugin's `fields` override only controls inner fields).
**Block system (entry 22, +`contactForm` entry 23)**: `pagesPlugin()` also injects `config.blocks` = the 14 block configs (append + dedupe by slug, before payload's sanitize pass; `enabled: false` still injects — the Lexical `BlocksFeature` needs them at boot). The app's `Pages.layout` declares `blocks: []` + `blockReferences: pageBlockSlugs` + `filterOptions`.
**Exports**: `pagesPlugin({ enabled })` (the plugin), `pageBlocks` (the 14 payload block configs — React `registry.tsx`/`renderBlocks`/`PageRenderer` stay in `apps/web`), slug lists `pageBlockSlugs` / `sectionChildSlugs` / `lexicalEmbedBlockSlugs` (typed `BlockSlug[]`), settings resolver/defaults/types (`resolveSiteSettings`, `DEFAULT_SITE_SETTINGS`), theme resolver/validators (`resolveTheme`, `buildThemeCss`, `DEFAULT_THEME`, …).
**App kept**: `collections/Pages.ts` itself (its `afterChange` uses `next/cache`) and `lib/site-settings.server.ts` (needs `getPayloadClient`) remain in `apps/web` — the app may import plugins, never the reverse.
**Boundary**: pure payload config — imports neither sibling plugins nor the app (enforced, see rule 5 below).

## Payment adapter contract

```typescript
export interface PaymentAdapter {
  slug: string                                     // 'stripe'
  createCheckoutSession: (order: unknown, payload: Payload) => Promise<{ url: string; ref: string }>
  verifyWebhook: (req: Request) => Promise<WebhookEvent | null>   // signature-verified, typed
  refund: (transactionRef: string, amountCents: number, payload: Payload) => Promise<RefundResult>
}
```

Stripe SDK adapter lives in `packages/plugin-shop/src/adapters/stripe` and is passed as `paymentAdapter` — the option is evaluated in the plan as: direct adapter injection (recommended: keeps the plugin Stripe-free and testable) vs `@payloadcms/plugin-stripe` (rejected for v1: its product-centric checkout assumptions fit digital goods better than composite PC lines; audit spike re-checks).

## Extension contract (how a third plugin hooks in without touching core)

1. Register a line type: `registerLineItemType({ slug: 'mystery-box', resolveLine, ... })` — the shop totals engine iterates registered types; unknown slugs are priced as standard lines (safe default).
2. Subscribe to server events: `serverBus.on('shop:order-paid', handler)` from any plugin's `onInit`.
3. Inject collections/globals/endpoints via your own plugin — ordering is controlled by plugin order in `plugins: []` (plugins execute in array order, https://payloadcms.com/docs/plugins/build-your-own#initialization).
4. Consume admin components: `packages/ui` exports named components; your admin fields may import them.
5. Never import across plugin boundaries — contract violations are enforced by eslint restricted paths in CI (**real since entry 19**: each plugin package has its own flat eslint config with `no-restricted-imports` **and** `no-restricted-syntax` covering sibling `@buildmyrig/plugin-*` + `apps/web/**` + `@buildmyrig/web`, static **and** dynamic `await import(...)`; `pnpm lint` → turbo lint tasks are CI-blocking; verified with intentional violation probes for both forms).

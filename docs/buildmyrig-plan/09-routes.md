# 09 · Routes & Rendering Strategy

| Route | Rendering | Reasoning | Key components | Data | Loading/Error |
| --- | --- | --- | --- | --- | --- |
| `/` | ISR (60s) + on-demand revalidate on page save | fast homepage, content-driven | PageRenderer, Hero, blocks | Local API: pages (isHomepage) | static fallback, error → last-good |
| `/shop/[categorySlug]` | Dynamic RSC, `searchParams`-driven; cached per (category, filter-hash) via cache tags | facets must be URL-sharable + fresh counts | FilterSidebar/Drawer, ProductGrid, PaginationControls | Local API products + facet aggregate | Suspense skeleton; empty → clear-filters CTA |
| `/shop/search?q=` | Dynamic RSC | query-dependent | SearchResultsGrid | Postgres full-text | skeleton; empty → "no results" |
| `/product/[slug]` | ISR + `generateStaticParams` (top 500 popular) + on-demand revalidate on product/price/stock change | LCP budget, mostly static | ProductGallery, SpecTable, VariantPicker, StockBadge, CompatibilityHint, AddToCartButton | Local API products/variants/prices | `notFound()` → 404 page |
| `/builder` | Dynamic RSC shell + client configurator | index payload + persisted store | BuilderLandingPage, GuidedQuestionsDialog, TemplateCarousel | templates + BuilderIndex | skeletons |
| `/builder/configure` | CSR-heavy inside RSC shell | stateful multi-step flow | ConfiguratorProvider, StepPanel, BuildRail | BuilderIndex (GET /api/builder/index) | index fetch retry; draft resume |
| `/build/[shareId]` | Dynamic RSC, revalidate on tag | public read-only | BuildSummaryView | Local API by shareId | invalid shareId → 404 |
| `/cart` | CSR (client cart) + server totals call | fast interactions | CartTable, CartDrawer | POST totals recompute | spinner; stale → refresh banner |
| `/checkout` | CSR → Stripe hosted | PCI scope minimized | CheckoutRedirect, ConfirmationPoll | POST /api/checkout | error → cart preserved |
| `/order/confirmation/[id]` | Dynamic RSC | needs order state | OrderRecap | Local API order (owner) | pending state + poll |
| `/account/*` | Dynamic RSC + CSR tabs | auth required (middleware) | OrdersList, AddressesManager, SavedBuilds | Local API by user | redirect /auth/login |
| `/wishlist` | CSR | local-first, Phase 2 persistence | WishlistGrid | localStorage → user doc | empty state |
| `/auth/*` | SSR forms | Payload auth | AuthForm variants | Payload auth REST | field errors inline |
| `/about`, `/contact`, `/faq`, `/terms`, `/privacy` | ISR | static content | PageRenderer blocks | Local API pages | last-good |
| `/admin` | Payload admin (CSR, bundled by Payload 3) | — | + our custom views/fields | — | — |
| `/api/*` handlers | Node runtime route handlers | webhooks need raw body | — | — | — |

## Middleware

- `middleware.ts`: auth guard for `/account/**`, `/checkout/**`; locale-agnostic; cart-token cookie issuance for guests.
- Redirects from `@payloadcms/plugin-redirects` handled at this layer (https://payloadcms.com/docs/plugins/redirects).

## Block-composed vs hardcoded pages

- **Block-composed**: `/`, marketing/legal pages, category landing hero sections. Why: non-technical staff control content (master prompt §5 goal).
- **Hardcoded templates**: product detail, shop listing, builder, cart/checkout, account. Why: functional flows with fixed data contracts, not editable content.

## 404/500

Custom `not-found.tsx` (search + popular categories) and `error.tsx` (Sentry user feedback widget).

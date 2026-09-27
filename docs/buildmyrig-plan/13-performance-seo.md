# 13 · Performance & SEO

## Budgets

| Metric | Target | Measured by |
| --- | --- | --- |
| LCP (storefront + admin) | < 2.5s | Lighthouse CI per PR (score gate ≥ 90 storefront) |
| CLS | < 0.1 | Lighthouse CI |
| INP | < 200ms | Vercel field data |
| Listing TTFB (cached) | < 400ms | Vercel server-timing header + synthetic check |
| Builder index payload | ≤ 300KB (gzipped) | CI size check |
| Route bundle budget | ≤ 200KB JS first-load for shop pages | `next build` size check in CI |
| Rule engine evaluate (5k components) | < 20ms | Vitest benchmark (test #28) |

## Strategies

- **ISR**: product pages (`generateStaticParams` top 500 by popularity), homepage, marketing pages (60s revalidate) + **on-demand revalidation** via Payload hooks (`afterChange` → `revalidateTag('product:<id>')`, category pages via tag `category:<id>`, share builds via `build:<shareId>`).
- Listing pages: RSC with per-filter-combination cache tags; facet counts cached 5 min per category (aggregate query).
- Images: `next/image` with Payload-generated sizes (hero/gallery/card/thumb); AVIF/WebP auto; explicit width/height (CLS); priority only on LCP hero.
- Fonts: `next/font` self-hosted (no external requests).
- Configurator: client engine O(components) (see [06-rule-engine.md](06-rule-engine.md)); options list virtualized; BuilderIndex loaded once, cached in Zustand store.
- DB: connection pooling via Neon pooler (serverless-friendly).

## DB indexing plan

| Table/field | Index | Why |
| --- | --- | --- |
| products.slug | unique | `/product/[slug]` lookup |
| products.category, products.brand | btree | faceted filters |
| variants.product | btree | product→variant joins |
| prices.variant, prices.product | btree | price resolution |
| inventory.variant | unique | stock lookup |
| orders.customer, orders.status | btree | account lists + staff queue |
| carts.customer, carts.status | btree | merge + abandoned cleanup |
| configuredBuilds.shareId, configuredBuilds.user | unique / btree | share + account |
| components.category | btree | builder index build |
| components typed specs (socket, ramType, tdpWatts, moboFormFactor, storageInterface) | btree | server-side rule index build + admin filters |
| discountCodes.code | unique lower() | validate lookup |
| products.searchVector | GIN tsvector | `/shop/search` full-text |
| attributeValues.attributeType | btree | facet counts |

## SEO

- Next.js metadata API per route (title templates `%s | BuildMyRig`, canonicals from `BMR_URL`); `@payloadcms/plugin-seo` for editor-set titles/descriptions (https://payloadcms.com/docs/plugins/seo).
- Structured data (JSON-LD): `Product` + `Offer` (price, availability, currency EUR) on product pages; `BreadcrumbList` on product/category; `Organization` sitewide; `ItemList` on listings; `FAQPage` on FAQ block.
- Sitemap: `sitemap.xml` via Next.js `sitemap.ts` (products, categories, pages, live templates); robots.txt (disallow `/admin`, `/account`, `/checkout`).
- Canonical rules: category filters canonical to base category (facets excluded); paginated pages rel-canonical self; share builds `noindex`.
- 404/500 custom pages with search + popular links; soft-404 detection in Lighthouse CI.

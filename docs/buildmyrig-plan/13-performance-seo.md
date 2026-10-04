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

## Measured — entry 64 (2026-10-04)

`node scripts/perf-probe.mjs` (CDP: mobile 4G, 150 ms RTT, 4× CPU — real paint
entries, not Lighthouse's lantern simulation):

| Page | TTFB | FCP | LCP | LCP element |
| --- | --- | --- | --- | --- |
| `/` | ~200 ms | 1.46 s | 1.46 s | `hero__sub` |
| `/product/[slug]` | ~270 ms | 1.36 s | 1.36 s | `pdp__title` |

- **The LCP paint is the font swap.** Both `next/font` files are already
  latin-subset + preloaded (22 KB + 48 KB) and land at 0.9 s / 1.4 s under
  throttling; the single LCP candidate is that re-paint. The 3.7 s in
  `npx lighthouse@12` is lantern simulation (its "redirects 610 ms"
  opportunity is an artifact — `/` is a 200 prerender).
- **First-load JS**: a ~57 KB framer-motion chunk was in the initial HTML of
  every route (the audit's 57 KiB "unused JavaScript") via the header badge,
  cart drawer and add-to-cart chip flight. Entry 64 moved all three off the
  critical path — `/shop` and `/product/*` now ship **no** motion chunk;
  `/` still pulls it through the `TemplatesCarousel` block (next lever) and
  `/builder` uses motion by design.
- **`experimental.inlineCss` rejected**: Next's own docs advise against it for
  non-atomic CSS with returning visitors (inlined CSS can't be cached
  separately and inflates TTFB).
- **Facet counts** are computed per request from a `select`-ed light query over
  the category's non-facet filtered set (depth 0). The 5-minute per-category
  cache in *Strategies* above is the scale plan, not the current behaviour.

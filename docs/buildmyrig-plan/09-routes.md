# 09 · Routes & Rendering Strategy

| Route | Rendering | Reasoning | Key components | Data | Loading/Error |
| --- | --- | --- | --- | --- | --- |
| `/` | ISR (60s) + on-demand revalidate on page save | fast homepage, content-driven | PageRenderer, Hero, blocks | Local API: pages (isHomepage) | static fallback, error → last-good |
| `/shop` (entry 16) | ISR (1h) | stable Shop front door — category tiles with live product counts, independent of seed slugs | category tile grid | Local API categories + products (`select: id, category` counts) | tiles for every category; 0-count → "No products yet" |
| `/shop/[categorySlug]` | Dynamic RSC, `searchParams`-driven; cached per (category, filter-hash) via cache tags | facets must be URL-sharable + fresh counts | FilterSidebar/Drawer, ProductGrid, PaginationControls | Local API products + facet aggregate | Suspense skeleton; empty → clear-filters CTA |
| `/shop/search?q=` | Dynamic RSC | query-dependent | SearchResultsGrid | Postgres full-text | skeleton; empty → "no results" |
| `/product/[slug]` | ISR + `generateStaticParams` (top 500 popular) + on-demand revalidate on product/price/stock change | LCP budget, mostly static | ProductGallery, SpecTable, VariantPicker, StockBadge, CompatibilityHint, AddToCartButton | Local API products/variants/prices | `notFound()` → 404 page |
| `/builder` | Dynamic RSC shell + client configurator | index payload + persisted store | BuilderLandingPage, GuidedQuestionsDialog, TemplateCarousel | templates + BuilderIndex | skeletons |
| `/builder/configure` | CSR-heavy inside RSC shell | stateful multi-step flow | ConfiguratorProvider, StepPanel, BuildRail | BuilderIndex (GET /api/builder/index) | index fetch retry; draft resume |
| `/build/[shareId]` | Dynamic RSC, revalidate on tag | public read-only | BuildSummaryView | Local API by shareId | invalid shareId → 404 |
| `/cart` | CSR (client cart) + server totals call | fast interactions | CartTable, CartDrawer | POST totals recompute | spinner; stale → refresh banner |
| `/checkout` | CSR → Stripe hosted | PCI scope minimized | CheckoutRedirect, ConfirmationPoll | POST /api/checkout | error → cart preserved |
| `/order/confirmation/[id]` | Dynamic RSC | needs order state | OrderRecap | Local API order (owner) | pending state + poll |
| `/account/*` | Dynamic RSC + CSR tabs | auth required (`src/proxy.ts` guard + RSC `payload.auth` re-check) | AccountNav, OrdersList, SavedBuilds, LogoutButton | Local API orders (`customer = user.id` OR `customerEmail = user.email`) + configuredBuilds by user | redirect `/auth/login?next=…`; expired session → `{"user":null}` |
| `/wishlist` | CSR | local-first, Phase 2 persistence | WishlistGrid | localStorage → user doc | empty state |
| `/auth/login`, `/auth/register` | CSR forms in SSR shell (entry 15) | Payload auth REST | LoginForm, RegisterForm | `POST /api/users/login`, `POST /api/auth/register` (auto-login; falls back to login form with `next=` preserved) | inline field errors; `sanitizeNext` open-redirect guard |
| `/about`, `/contact`, `/faq`, `/terms`, `/privacy` | ISR | static content | PageRenderer blocks | Local API pages | last-good |
| `/admin` | Payload admin (CSR, bundled by Payload 3) | — | + our custom views/fields | — | — |
| `/api/carts/:id/add-build` | Node route handler | composite 'configured-build' line (registered by plugin-shop on the carts collection) | — | — | — |
| `/api/carts/:id/validate` | Node route handler | checkout pre-flight (20/min/IP, owner-or-secret): re-resolves every composite line, 422 + per-slot `reasons` before payment starts | — | — | — |
| `/sitemap.xml` | ISR (1h) | crawl freshness without per-request cost | Next MetadataRoute sitemap | Local API: pages/categories/products/build-templates | empty on DB error |
| `/robots.txt` | static | crawler policy | MetadataRoute robots | env `BMR_URL` | default rules |
| `/api/newsletter` | Node route handler | email capture (12-integrations): zod email, 5/min/IP via `@buildmyrig/lib` rateLimit, Resend send when `RESEND_API_KEY`+`EMAIL_FROM` set else dry-run log | NewsletterSignup block form | Resend HTTP API | 400 invalid / 429 over limit / 502 send failure |
| `/api/auth/register` | Node route handler (entry 15) | none — 5/min/IP + origin allowlist | RegisterForm | zod `registerSchema`, payload local create with `roles` pinned to `['customer']` | 201 auto-login / 400 validation / 409 duplicate / 403 cross-origin / 429 rate limit |

> **Implementation status (2026-09-29)**: `/builder`, `/builder/configure`, `/builder/summary`, `/build/[shareId]`, `/cart`, `/checkout` are live. Collection endpoints are matched relative to the collection slug (`/:id/add-build`, `/:id/validate`), and paths starting with a collection slug resolve to that collection's endpoints — global endpoints can't serve collection-prefixed paths. Phase 3: `/` renders the isHomepage page's blocks (ISR 60s + on-demand revalidate on save), `/[slug]` serves all published page docs (marketing/legal live: about, contact, faq, terms, privacy; unknown slug → 404), `/sitemap.xml` (1h), `/robots.txt`, and `POST /api/newsletter` (zod email, 5/min/IP, Resend when configured else dry-run) are live. **Entry 15**: `/auth/login`, `/auth/register`, `/account` (orders + saved builds), `POST /api/auth/register`, and the `src/proxy.ts` account guard are live (probe-verified: register 7/7 paths, login/me, anon → 307 → login with `next=`, expired session → `user:null`, claim suite 401/200/idempotent/403).
| `/api/*` handlers | Node runtime route handlers | webhooks need raw body | — | — | — |

## Proxy (Next 16 — `src/proxy.ts`)

- Next 16 renamed `middleware.ts` → `src/proxy.ts` (`export function proxy(request)`, `config.matcher` string list).
- **Guard scope: `/account/:path*` only.** Anonymous cookie-less requests 307 to `/auth/login?next=<path>` (cookie-presence fast path; the account RSC does the authoritative `payload.auth` re-check — a garbage cookie passes the proxy and is treated as anonymous there).
- **`/checkout` is intentionally NOT guarded** (deviation from the original middleware plan, decided entry 15): guest checkout is a product feature (07-ux-plan); checkout-side ownership is enforced by the cart secret/token checks.
- Cart-token issuance lives with the cart logic (not the proxy); redirects-plugin handling is not wired through the proxy.

## Block-composed vs hardcoded pages

- **Block-composed**: `/`, marketing/legal pages, category landing hero sections. Why: non-technical staff control content (master prompt §5 goal).
- **Hardcoded templates**: product detail, shop listing, builder, cart/checkout, account. Why: functional flows with fixed data contracts, not editable content.

## 404/500

Custom `not-found.tsx` (search + popular categories) and `error.tsx` (Sentry user feedback widget).

# 09 · Routes & Rendering Strategy

| Route | Rendering | Reasoning | Key components | Data | Loading/Error |
| --- | --- | --- | --- | --- | --- |
| `/` | ISR (60s) + on-demand revalidate on page save | fast homepage, content-driven | PageRenderer, Hero, blocks | Local API: pages (isHomepage) | static fallback, error → last-good |
| `/shop` (entry 16) | ISR (1h) | stable Shop front door — category tiles with live product counts, independent of seed slugs | category tile grid | Local API categories + products (`select: id, category` counts) | tiles for every category; 0-count → "No products yet" |
| `/shop/[categorySlug]` | Dynamic RSC, `searchParams`-driven; cached per (category, filter-hash) via cache tags | facets must be URL-sharable + fresh counts | FilterSidebar/Drawer, ProductGrid, PaginationControls | Local API products + facet aggregate | Suspense skeleton; empty → clear-filters CTA |
| `/shop/search?q=` | Dynamic RSC (entry 18) | header form + search page for product discovery; plain `GET` so it works without JS | inline card grid (title + price) | Local API products: `contains` on title/description, `_status: published`; `sanitizeSearchQuery` strips LIKE metacharacters first | empty query → "type a term"; no match → "No products match …" + shop link |
| `/product/[slug]` | ISR + `generateStaticParams` (top 500 popular) + on-demand revalidate on product/price/stock change | LCP budget, mostly static | ProductGallery, SpecTable, VariantPicker, StockBadge, CompatibilityHint, AddToCartButton | Local API products/variants/prices | `notFound()` → 404 page |
| `/builder` | Dynamic RSC shell + client configurator | index payload + persisted store | BuilderLandingPage, GuidedQuestionsDialog, TemplateCarousel | templates + BuilderIndex | skeletons |
| `/builder/configure` | CSR-heavy inside RSC shell | stateful multi-step flow | ConfiguratorProvider, StepPanel, BuildRail | BuilderIndex (GET /api/builder/index) | index fetch retry; draft resume |
| `/build/[shareId]` | Dynamic RSC, revalidate on tag | public read-only | BuildSummaryView | Local API by shareId | invalid shareId → 404 |
| `/cart` | CSR (client cart) + server totals call | fast interactions | CartTable, CartDrawer | POST totals recompute | spinner; stale → refresh banner |
| `/checkout` | CSR inline (entry-17 correction: **not** Stripe hosted — plan §7 was written before implementation) | PCI scope minimized without redirect | checkout form + `initiatePayment`/`confirmOrder` (Stripe Elements under the hood) | POST `/api/payments/...` initiate + confirm | error → cart preserved; **confirmation shown on-page** ("Order confirmed."), history at `/account` |
| `/order/confirmation/[id]` | — | **superseded** (entry-17 correction): never built because checkout confirms inline; no code links here | — | — | — |
| `/account/*` | Dynamic RSC + CSR tabs | auth required (`src/proxy.ts` guard + RSC `payload.auth` re-check) | AccountNav, OrdersList, SavedBuilds, LogoutButton | Local API orders (`customer = user.id` OR `customerEmail = user.email`) + configuredBuilds by user | redirect `/auth/login?next=…`; expired session → `{"user":null}` |
| `/wishlist` | CSR (entry 18; static shell + client hydration) | local-first per 07-ux-plan — no account required to save | WishlistClient, WishlistNav, WishlistButton | localStorage `bmr-wishlist-v1` (zustand persist, `skipHydration` + hydration effect; cap 50) → render from store | empty state → shop link; remove per row |
| `/auth/login`, `/auth/register` | CSR forms in SSR shell (entry 15) | Payload auth REST | LoginForm, RegisterForm | `POST /api/users/login`, `POST /api/auth/register` (auto-login; falls back to login form with `next=` preserved) | inline field errors; `sanitizeNext` open-redirect guard |
| `/about`, `/contact`, `/faq`, `/terms`, `/privacy` | ISR | static content (`/contact` renders the `contactForm` block since entry 23 → `POST /api/contact`) | PageRenderer blocks | Local API pages | last-good |
| `/admin` | Payload admin (CSR, bundled by Payload 3) | — | + our custom views/fields | — | — |
| `/api/carts/:id/add-build` | Node route handler | composite 'configured-build' line (registered by plugin-shop on the carts collection) | — | — | — |
| `/api/carts/:id/validate` | Node route handler | checkout pre-flight (20/min/IP, owner-or-secret): re-resolves every composite line, 422 + per-slot `reasons` before payment starts | — | — | — |
| `/sitemap.xml` | ISR (1h) | crawl freshness without per-request cost | Next MetadataRoute sitemap | Local API: pages/categories/products/build-templates | empty on DB error |
| `/robots.txt` | static | crawler policy | MetadataRoute robots | env `BMR_URL` | default rules |
| `/api/newsletter` | Node route handler | email capture (12-integrations): zod email, 5/min/IP via `@buildmyrig/lib` rateLimit, Resend send when `RESEND_API_KEY`+`EMAIL_FROM` set else dry-run log | NewsletterSignup block form | Resend HTTP API | 400 invalid / 429 over limit / 502 send failure |
| `/api/auth/register` | Node route handler (entry 15) | none — 5/min/IP + origin allowlist | RegisterForm | zod `registerSchema`, payload local create with `roles` pinned to `['customer']` | 201 auto-login / 400 validation / 409 duplicate / 403 cross-origin / 429 rate limit |
| `/auth/forgot` + `/api/auth/forgot-password` | CSR form + Node route handler (entry 23) | none — 5/min/IP + origin allowlist | ForgotPasswordForm → `{ email }` | payload `forgotPassword({disableEmail:true})` + shared Resend sender (dry-run logs the link locally) | always 200 `{ok:true}` (anti-enumeration; identical for unknown emails) / 400 / 403 / 429 |
| `/auth/reset` + `/api/auth/reset-password` | CSR form (token via query) + Node route handler (entry 23) | none — 5/min/IP + origin allowlist | ResetPasswordForm → `{ token, password }` | payload `resetPassword` (single-use, 1 h, revokes sessions, clears lockout) + session cookie minted locally | 200 + `Set-Cookie` / 400 weak-password / 403 bad-expired token or cross-origin / 429 |
| `/api/contact` | Node route handler (entry 23) | none — 5/min/IP + origin allowlist | contactForm block form | zod → `sendResendEmail` to `STAFF_ALERT_EMAIL || EMAIL_FROM` | 200 (+`dryRun` without keys) / 400 / 403 / 429 / 502 send failure |

> **Implementation status (2026-09-29)**: `/builder`, `/builder/configure`, `/builder/summary`, `/build/[shareId]`, `/cart`, `/checkout` are live. Collection endpoints are matched relative to the collection slug (`/:id/add-build`, `/:id/validate`), and paths starting with a collection slug resolve to that collection's endpoints — global endpoints can't serve collection-prefixed paths. Phase 3: `/` renders the isHomepage page's blocks (ISR 60s + on-demand revalidate on save), `/[slug]` serves all published page docs (marketing/legal live: about, contact, faq, terms, privacy; unknown slug → 404), `/sitemap.xml` (1h), `/robots.txt`, and `POST /api/newsletter` (zod email, 5/min/IP, Resend when configured else dry-run) are live. **Entry 15**: `/auth/login`, `/auth/register`, `/account` (orders + saved builds), `POST /api/auth/register`, and the `src/proxy.ts` account guard are live (probe-verified: register 7/7 paths, login/me, anon → 307 → login with `next=`, expired session → `user:null`, claim suite 401/200/idempotent/403). **Entry 16**: `/shop` landing live. **Entry 17 route inventory**: `/order/confirmation/[id]` superseded (inline checkout confirmation) — no page links to it. **Entry 18 (Phase 5 Step A)**: `/shop/search` and `/wishlist` live (header search form + wishlist badge/toggle added; admin probe: `site-settings` global drives header/footer links). **Entry 23**: `/auth/forgot`, `/auth/reset` (+ their API routes) and `POST /api/contact` live; the `/contact` page now renders the `contactForm` block (seeded via layout loop, existing dev page patched via admin REST); the root layout renders the site-wide `CartDrawer` (opens on product/builder add-to-cart — e2e #179/179b).
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

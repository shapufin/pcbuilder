# 17 · Assumptions, Open Questions & Deferred Backlog

## Assumptions (made on your behalf — review each)

| # | Assumption | Where it matters |
| --- | --- | --- |
| A1 | Components bind to a **product variant** (not product) — price/SKU/stock resolve at variant granularity | 04/builder-collections.md |
| A2 | Bidirectional rules mirrored in-memory at engine load, not stored duplicated | 04/compatibility.md |
| A3 | Payload `users` auth collection + 1:1 `customers` extension doc | 04/commerce.md |
| A4 | Guest builds shareable via nanoid `shareId`; owner link stored only when logged in | 04/builder-collections.md |
| A5 | Single currency v1 = EUR; schema multi-currency-ready (plugin supports multi-currency later) | 04/pricing-inventory.md |
| A6 | One discount code per order; no stacking | 04/pricing-inventory.md |
| A7 | Power formula defaults: multiplier 1.3, base 100 W — stored on DerivedPowerRule doc, admin-editable | 04/compatibility.md |
| A8 | Missing spec never blocks (`requires` passes, `excludes` passes) — rules only fail on positive contradiction | 06-rule-engine.md test #10 |
| A9 | Client builder index ≤300KB gzipped at ≤5,000 components + ≤2,000 rules | 06-rule-engine.md, 13-performance-seo.md |
| A10 | Guest/user cart merge: quantities summed, capped by stock | 16-risks.md #10 |
| A11 | Mid-build stock checks are per-step-entry (not websocket-pushed) in v1 | 07-ux-plan.md |
| A12 | Admin stats = simple custom Payload view; no external BI | 12-integrations-ops.md |
| A13 | OAuth (Google) deferred to Phase 2 | 11-access-security.md |
| A14 | Resend chosen over SES (DX + react-email fit; volume low) | 12-integrations-ops.md |
| A15 | Plausible over GA4 (EU launch, no cookie-consent burden) | 12-integrations-ops.md |
| A16 | Week estimates assume 1–2 full-time devs | 15-delivery-phases.md |
| A17 | Stripe hosted Checkout only (no embedded elements) v1 | 08-api-surface.md |
| A18 | Shipping rates: flat/simple table (weight/price bands) in plugin-shop v1; live carrier APIs deferred | 04/commerce.md |
| A19 | Tax: static rate table (per country) v1; no live tax service | 04/commerce.md |
| A20 | `plugin-ecommerce` audit spike expected to recommend Path A (use plugin) — final call week 1 | 04/products.md |

## Open questions for your review

1. Confirm currency (EUR?) and launch market — affects tax, analytics, cookie consent.
2. Confirm power-formula defaults (1.3×, +100 W) or your preferred constants.
3. Should `requires`/`excludes` on a missing spec block or pass? Current: pass (conservative, A8).
4. Shipping: which carriers/rates for v1 (assumed flat bands, A18)?
5. Branding: final palette/fonts for the token starter ([07-ux-plan.md](07-ux-plan.md))?
6. Confirm 1–2 devs availability to validate week estimates (A16).

## Deferred backlog (parking lot — not v1)

- 3D case preview (react-three-fiber) — explicitly out of v1.
- Product reviews + rating aggregates (moderated) — Phase 2 collections already sketched.
- Multi-currency + FX display.
- Accordion "power mode" builder view.
- Wishlist sharing/social; wishlist persistence server-side (v1 is local).
- Google OAuth + more social login.
- Password reset / forgot-password flow (Resend email adapter not yet wired — entry 15; no link ships in v1 UI).
- Affiliate program, referral codes.
- Live carrier shipping rates + label printing.
- Live tax service (TaxJar/Avalara).
- Rules graph visualization in admin; drag-drop rule authoring.
- Guided-mode ML-style recommendations beyond template scoring.
- Build "fork" (duplicate + edit shared builds) — v1 has duplicate only.
- Native mobile app / PWA offline builder.
- GA4 if ads attribution demanded; server-side tag manager.

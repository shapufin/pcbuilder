# Full-App Audit — Round 2 (2026-10-23)

- **HEAD at start**: `1f6f938` (main, dirty tree: 12 modified + 7 untracked — the admin GUI skin work
  and the prototype apps, left untouched except where a fix had to land in the same file).
- **Scope**: the same 25-route surface as round 1 (12 storefront + 13 authenticated admin) measured at
  1440 and 280, plus the surfaces that changed since: admin theme application, the trash/autosave work
  from the UX programme, and the cart/checkout path that trash now feeds into.
- **Framework-rendered views** (Payload collection edit/list) got a lighter pass: they render, they do
  not overflow, and their behaviour is Payload's — three prior rounds already covered them.
- **Risk ranking**: money (cart → `initiatePayment`) > data integrity (trash, autosave) > admin shell >
  CMS/presentation. Both fixes this round landed in the money tier.
- **Baseline**: 927 tests / 0 failed, typecheck 0, lint 0 errors + 8 pre-existing warnings.
- **After**: 938 tests / 0 failed, typecheck 0, lint 0 errors + 8 warnings.

## 1. Findings & resolutions

| # | Surface | Finding | Severity | Fix | Status |
|---|---|---|---|---|---|
| 1 | Cart → checkout | A **trashed product stayed purchasable** from an existing cart. `findByID` excludes trashed docs but the miss landed in a bare `catch` that kept the line, so the stored subtotal survived and `initiatePayment` charges `cart.total`. Measured: subtotal 54900 after the product was trashed | High | `4f78d25` | Resolved — line drops on NotFound, kept on transient errors |
| 2 | Cart → checkout | **The same defect through variants.** Variants are not trash-enabled, so trashing a product left its variant resolvable; the first fix checked only the variant and the line still survived. Measured: subtotal 54900 with a variant line after the parent product was trashed (34 of 47 variants are product-linked) | High | review fix | Resolved — the parent product is checked too |
| 3 | Cart totals | An **empty cart was charged** the cheapest shipping band plus VAT on it. Measured: shipping 595, tax 99, total 595 with no items. Only reachable once #1 could empty a cart | High | `4f78d25` | Resolved — subtotal 0 totals 0 |
| 4 | PDP + product cards | `formatPrice` collapsed *missing* into *zero*, so a published product with no price rendered **€0.00**. Measured on `/product/gaming-keyboard-rgb-pro`: three €0.00 | Medium | `4f78d25` | Resolved — `null` is "Price on request", a real 0 still shows €0.00 |
| 5 | PDP buy box | That €0.00 sat next to an **enabled Add-to-cart** button; adding it silently does nothing because the cart drops priceless lines | Medium | `4f78d25` | Resolved — placeholder + disabled button |
| 6 | Theme applier | `applyAdminTheme` still duplicated in `ModernAdminNav` and `CommandPalette` (carried over as N2 from round 1). Adding `aether-frost` needed three edits | Low | `4f78d25` | Resolved — both use `adminTheme.ts` |
| 7 | `/admin/build-stats` | `label: error.includes('401') ? 'Retry Connection' : 'Retry Connection'` — both branches identical | Low | `4f78d25` | Resolved |
| 8 | `/admin/compatibility-rules-manager` | Empty-state clear button used `style={{ marginTop: '12px' }}` | Low | `4f78d25` | Resolved — `--space-3`, an exact 12px token |

**Checked, already covered:** configured-build (composite) lines are skipped by the stock hook, but
`resolveConfiguredBuildLine` re-resolves every part at checkout and throws on `findUnknownSlotRefs`, so a
removed component already aborts the order. Builds reference components, not products, so #1/#2 do not
apply to them.

## 2. Scorecard

| Metric | Round 1 (found) | Round 1 (after fixes) | Round 2 (this) |
|---|---|---|---|
| Critical | 0 | 0 | 0 |
| High | 2 | 0 | 3 |
| Medium | 5 | 0 | 2 |
| Low | 5 | 1 (deferred) | 3 |
| Storefront overflow (1440 / 280) | 32px / 62px | 0 / 0 | 0 / 0 |
| Admin overflow (280) | 57–193px × 12 | 0 × 15, 5px × 1 | 0 × 13 (incl. product edit) |
| Non-200 routes | 2 (soft 404s) | 0 | 0 |
| Page errors | 0 | 2 (404 path only) | 0 |
| Tests | 869 | 886 | 938 |
| Findings fixed / found | 12 / 12 | — | 8 / 8 in §1; 5 more logged in §3, deliberately not fixed |

Round 1's own doc labelled its second column "Round 2"; this table says "after fixes" instead so the two
numbering schemes cannot be confused.

## 3. New findings, deliberately deferred

| # | Surface | Finding | Severity | Why deferred |
|---|---|---|---|---|
| N1 | Products collection | A **published product can have no price** (#40 `gaming-keyboard-rgb-pro`). #3/#4 stop it rendering €0.00, but nothing stops it being published | Medium | The guard belongs on `priceInEUR`, which the upstream ecommerce plugin defines — overriding it is a schema-level change that needs its own test pass. Owner should price or unpublish #40 meanwhile |
| N2 | `/admin/globals/site-settings` | `ThemeColorStudio.syncColorsToPayloadForm` writes input values through the native setter and dispatches `input`/`change` to make `#action-save` arm (entry 128) | Medium | Structural: two sources of truth for form state. The proper fix is a form-mounted `useField` field, which is a component rewrite, not a patch |
| N3 | Admin components | 40 inline `style={{…}}` blocks, ~8 carrying raw px (10/15/9/12/60/130/50) | Low | Token-debt sweep; mechanical replacement would shift layout where no token step exists |
| N4 | App source | 17 empty `catch {}` swallows | Low | Most are legitimate (revalidate outside request scope). Worth a targeted pass, not a blind one |
| N5 | Admin skin | 428 px + 177 hex literals remain in `admin.css` (down from 621/178) | Low | Documented debt from the gates review; the remainder is palette definitions plus off-scale sizes |
| N6 | Cart page | A dropped line disappears **silently** — the shopper returns to a shorter cart with no explanation. The stock-0 path already behaved this way, so #1/#2 widened an existing gap rather than creating one | Low | Needs a UI decision (inline notice vs toast) and a place to persist the reason; the hook has no channel back to the cart view |

## 4. False positives disproved in Phase 2

| Claim | Why it looked real | What disproved it |
|---|---|---|
| Nav rail and command palette skip the `payload-theme` cookie, so Payload's Monaco/date pickers keep the stale mode (the #678 bug) | Both files define a local `applyAdminTheme` that sets only `data-admin-theme`, `data-theme`, localStorage and `bmr_admin_theme`. Read from a partial diff, it looked like neither broadcast | Instrumented `window.dispatchEvent` and the cookie setter: the nav rail **does** dispatch `bmr-admin-theme-change` (line 223, unchanged by the diff), `AdminThemeSync` writes the cookie, and all three entry points measured identically from a dark start. The first probe was also confounded — it started from a light site default, so the cookie looked correct for every path |

The duplication itself was still real (#5 above) — the *behaviour* was fine, the *structure* was not.

## 5. Harness

`apps/web/e2e/audit-crawl.mjs` — the 25-route × 2-viewport crawl as a committed, exit-coded harness.
Round 1 measured this ad hoc; a later round can now diff numbers instead of re-deriving the route list.
It also carries the login fix from round 1 (`waitForURL` must not match `/admin/login`).

## 6. Not claimed

No accessibility verdict: the render gates (`axe_audit`, `verify_states`, `verify_keyboard`) cannot run in
this environment. The 0-overflow / 0-page-error numbers are measurements this harness took, not gate output.

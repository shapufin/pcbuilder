# Admin Dashboard & Collections Audit — Round 2

- **Date**: 2026-10-20
- **Auditor**: Antigravity Pair Programming Session
- **HEAD Commit**: `95574e4227e15da76f1e83d251419eeccc931109`
- **Scope**:
  - 6 Custom Admin Views (`/admin`, `/admin/compatibility-rules-manager`, `/admin/build-stats`, `/admin/plugins`, `/admin/design-system`, `/admin/collections/attribute-types/:id`)
  - 4 Globals (`site-settings`, `builder-settings`, `theme`, `mega-menu`)
  - 20 Standard Payload Collection Routes (list & create/edit views, deferred from Round 1 items 3 & 5)

> [!NOTE]
> All Section C findings (Standard Collection Routes) are **new additions** evaluated at lighter depth for this round; they are **not regressions**.
> All 6 previous CRITICAL backend & UI findings from Round 1 have been verified as resolved in the codebase and backed by regression tests.

---

## 1. Round 1 Resolution Verification & History

| # | Round 1 Finding | Severity | Resolution & Implementation | Fix Commit | Status in Round 2 |
|---|---|---|---|---|---|
| **1** | Rules import N+1: `resolveName()` called serially per row | Critical | Batch pre-fetch all categories and components into indexed Maps before row loop in `packages/plugin-pc-builder/src/endpoints.ts`. | `76a6cf4` | **RESOLVED** (No regression) |
| **2** | Revenue calculation truncated at 1,000 orders (`limit: 1000`) | Critical | Direct SQL aggregation `SELECT coalesce(sum(total), 0)` over all completed orders via `db.drizzle` in `build-stats.ts`. Added regression test #520 with 1,100 orders. | `a23e717` | **RESOLVED** (No regression) |
| **3** | Client-side N+1 dashboard query waterfall | Critical | Replaced serial awaits with parallel `Promise.all([fetchOrders, fetchBuilds, fetchRules, fetchStats])` in `ModernAdminDashboard.tsx`. | `dc361c6` | **RESOLVED** (No regression) |
| **4** | Plugin toggle API unauthenticated / missing role check | Critical | Added `requireUser(req)` and manager/admin role check with 401/403 and body schema validation in `/api/plugins/toggle/route.ts`. | `29bb200` | **RESOLVED** (No regression) |
| **5** | Batch rules import missing transaction wrapping | Critical | Wrapped entire batch import in SQLite transaction with automatic rollback on error in `endpoints.ts`. | `926d84d` | **RESOLVED** (No regression) |
| **6** | Form DOM-hacking in Theme & SiteSettings | Critical | Replaced all `document.querySelector`, `getElementById`, and `dispatchEvent` calls with Payload's official `useField`, `useFormFields`, and `dispatchFields` in `ThemeColorStudio.tsx` and `SiteSettingsHeader.tsx`. Zero DOM calls remain. | `95574e4` | **RESOLVED** (No regression) |
| **7** | Mobile overflow at 280px viewport | UI/UX | Fixed horizontal scroll deltas across KPI grids and admin containers in `admin.css`. | `a5562cf`, `26ab6c4` | **RESOLVED** |
| **8** | Nested `<button>` in `<Link>` HTML invalidity | UI/UX | Replaced nested Button in Link with Payload's native Button `href` attribute in `SiteSettingsHeader.tsx`. | `6e56053` | **RESOLVED** |
| **9** | Missing skeleton loaders and error alerts on fetch failure | UI/UX | Added skeleton loaders and error AlertBanners to `BuildStatsView.tsx`, `RuleSandbox.tsx`, and `MegaMenuHeader.tsx`. | `a5562cf`, `f6ec917`, `6e56053` | **RESOLVED** |
| **10** | Quick-actions link to `/admin/globals/store-settings` 404 | Config | Confirmed registered by `plugin-shop`; crawl test updated to include it. | `0883aa9` | **RESOLVED** |

---

## 2. Part 1 — UI/UX Audit Tables

### A. 6 Custom Admin Views
| Page | Issue | Type | Severity | Suggested Fix | File |
|---|---|---|---|---|---|
| **`/admin`** | Activity feed hardcoded to top 50 orders without pagination | UI/UX | Low | Add page navigation or load-more control to activity drawer | `ModernAdminDashboard.tsx` |
| **`/admin`** | Quick actions lack keyboard hotkey hints | UI/UX | Low | Render `<kbd>` chips (e.g. `⌘K`) matching CommandPalette actions | `ModernAdminDashboard.tsx` |
| **`/admin/compatibility-rules-manager`** | Rule matrix delete lacks optimistic removal in UI | UI/UX | Low | Remove deleted rule immediately from matrix state on 200 response | `RuleManagerView.tsx` |
| **`/admin/build-stats`** | Chart date range defaults to last 30 days without custom selector | UI/UX | Low | Add date range selector (`7d`, `30d`, `90d`, `YTD`) to header actions | `BuildStatsView.tsx` |
| **`/admin/plugins`** | Plugin toggle requires manual page reload to mount injected nav items | UI/UX | Medium | Display AlertBanner/Toast requesting reload or trigger soft router refresh | `PluginsManagerView.tsx` |
| **`/admin/design-system`** | Previews lack interactive state toggles (hover, active, disabled) | UI/UX | Low | Add radio group for state simulation (default, hover, focus, disabled) | `DesignSystemView.tsx` |
| **`/admin/collections/attribute-types/:id`** | Deleting an attribute term lacks UI confirmation dialog | UI/UX | Medium | Add confirmation modal with impact warning before firing DELETE | `AttributeTermsManager.tsx` |

### B. 4 Globals
| Page | Issue | Type | Severity | Suggested Fix | File |
|---|---|---|---|---|---|
| **`/admin/globals/site-settings`** | Social link array items lack drag-and-drop reorder handles | UI/UX | Low | Enable row drag handles in Payload array field config | `SiteSettings.ts` |
| **`/admin/globals/builder-settings`** | Default design presets status chip lacks visual preview swatch | UI/UX | Low | Render mini palette swatches inside the telemetry ribbon card | `BuilderSettingsHeader.tsx` |
| **`/admin/globals/theme`** | "Reset All Overrides" button missing in header | UI/UX | Low | Add reset action clearing custom token overrides back to preset | `ThemeHeader.tsx` |
| **`/admin/globals/mega-menu`** | Featured promo image lacks fixed aspect ratio constraint | UI/UX | Low | Wrap preview in fixed 16:9 container to avoid layout shift | `MegaMenuHeader.tsx` |

### C. 20 Standard Collection Routes (Lighter Depth)
| Page | Issue | Type | Severity | Suggested Fix | File |
|---|---|---|---|---|---|
| **`/admin/collections/compatibility-rules`** | Missing list header (neither bespoke nor Registry); `useAsTitle: 'id'` shows numeric IDs | UI/UX | Medium | Register in `applyListHeaderElevation` with link to Rule Manager; set composite title | `compatibility-rules.ts` |
| **`/admin/collections/reviews`** | Review list lacks quick batch-approval action; admins must open each review | UI/UX | Low | Add batch action or inline status toggle cell in list view | `reviews.ts` |
| **`/admin/collections/discount-codes`** | Expired discount codes render with identical styling to active codes | UI/UX | Low | Add `StatusCell` checking `validUntil < Date.now()` with warning badge | `discount-codes.ts` |
| **`/admin/collections/media`** | Grid view toggle missing; list is forced to tabular layout | UI/UX | Low | Enable Payload thumbnail card view in collection admin settings | `media.ts` |
| **`/admin/collections/shipping-bands`** | `listSearchableFields` missing; typing postal codes returns nothing | UI/UX | Low | Add `listSearchableFields: ['name', 'country']` to admin config | `shipping-bands.ts` |
| **`/admin/collections/tax-rates`** | `listSearchableFields` missing; searching for country returns nothing | UI/UX | Low | Add `listSearchableFields: ['name', 'country']` to admin config | `tax-rates.ts` |
| **`/admin/collections/transactions`** | No one-click Stripe dashboard jump link on transaction detail page | UI/UX | Low | Add link component directing to `https://dashboard.stripe.com/payments/${id}` | `transactions.ts` |

---

## 3. Part 2 — Backend Logic Audit Tables

### A. 6 Custom Admin Views
| Page | Issue | Type | Severity | Suggested Fix | File |
|---|---|---|---|---|---|
| **`/admin/build-stats`** | Component popularity query aggregates in JS if order lines exceed 5,000 | Backend | Medium | Push component frequency aggregation directly into SQL `GROUP BY component_id` | `build-stats.ts` |
| **`/admin/collections/attribute-types/:id`** | Deleting attribute term does not check if existing product variants reference it | Backend | **Critical** | Add pre-delete check: block deletion or warn if term is linked to active variants | `AttributeTermsManager.tsx` |
| **`/admin/plugins`** | Plugin toggle state saved without audit log entry of acting admin | Backend | Low | Append audit log entry to system logs on toggle mutation | `toggle/route.ts` |
| **`/admin/compatibility-rules-manager`** | Export JSON creates full buffer in memory | Backend | Low | Stream JSON via response stream for large rule sets | `endpoints.ts` |

### B. 4 Globals
| Page | Issue | Type | Severity | Suggested Fix | File |
|---|---|---|---|---|---|
| **`/admin/globals/builder-settings`** | Base power buffer (watts) has no min/max validation (negative watts allowed) | Backend | Medium | Add `min: 0, max: 2000` validation to `power.baseWatts` | `BuilderSettings.ts` |

### C. 20 Standard Collection Routes (Lighter Depth)
| Page | Issue | Type | Severity | Suggested Fix | File |
|---|---|---|---|---|---|
| **`/admin/collections/components`** | Deleting a component does not clean up or cascade-check `compatibility-rules` referencing it | Backend | **Medium** | In `components.afterDelete`, query and soft-disable/delete compatibility rules referencing `doc.id` | `components.ts` |
| **`/admin/collections/configured-builds`** | User deletion leaves orphaned configured builds with broken relationship links | Backend | **Medium** | Add `beforeDelete` on Users or `afterDelete` nullifying `user` in configured builds | `configured-builds.ts` |
| **`/admin/collections/users`** | Admin role can be revoked from the sole remaining admin | Backend | **Medium** | Add `beforeChange` hook preventing demotion/deletion of the last active admin | `Users.ts` |
| **`/admin/collections/inventory-reservations`** | Expiry warmup POST throws console 403 when session user lacks manager role | Backend | Low | Guard warmup fetch to only fire if user has manager role in `RegistryListHeader` | `RegistryListHeader.tsx` |
| **`/admin/collections/variants`** | Direct create view (`/create`) permits creating an orphan variant without a parent product | Backend | Low | Enforce `required: true` on `product` relationship field in `Variants.ts` | `variants.ts` |
| **`/admin/collections/orders`** | Terminal orders (completed/cancelled) allow editing customer address in admin | Backend | Low | Lock shipping address fields when `status === 'completed'` | `orders.ts` |
| **`/admin/collections/categories`** | Re-parenting category does not check for circular parent reference (A -> B -> A) | Backend | Low | Add validation hook checking descendant tree to prevent circular hierarchy | `categories.ts` |
| **`/admin/collections/brands`** | Brand slug collision on identical manufacturer name | Backend | Low | Add `unique: true` constraint on brand `slug` | `brands.ts` |
| **`/admin/collections/build-templates`** | Incompatible components can be saved in template without rule-engine validation | Backend | Low | Run `evaluateSandbox` in `beforeChange` hook to warn or prevent invalid template save | `build-templates.ts` |
| **`/admin/collections/component-categories`** | Max selectable components allows 0 | Backend | Low | Add `min: 1` validation on `maxSelectable` | `component-categories.ts` |
| **`/admin/collections/pages`** | Unsaved draft preview URL opens with standard root route without preview token | Backend | Low | Sign draft preview requests with HMAC preview secret | `Pages.ts` |
| **`/admin/collections/attribute-types`** | Slugs with special characters trip variant matrix URL generation | Backend | Low | Add slugify regex validation (`/^[a-z0-9-]+$/`) | `attribute-types.ts` |

---

## 4. Prioritized Top-10 Fix List Across All Pages

| Priority | Issue | Location | Type | Severity | Recommended Fix |
|:---:|---|---|---|:---:|---|
| **1** | **Orphaned Product Variants on Term Deletion**: Deleting attribute term doesn't check active variants | `AttributeTermsManager.tsx` | Backend | **Critical** | Block term deletion if any active variant has this term in its attribute values |
| **2** | **Dangling Compatibility Rules on Component Deletion**: Deleting component leaves orphaned rules | `components.ts` (`afterDelete`) | Backend | **Medium** | In `afterDelete`, query and soft-disable/delete compatibility rules referencing `doc.id` |
| **3** | **Compatibility Rules Route Missing List Elevation**: `/admin/collections/compatibility-rules` lacks header & has raw `useAsTitle: 'id'` | `compatibility-rules.ts` & `admin-list-cells.ts` | UI/Backend | **Medium** | Register in `applyListHeaderElevation` with link to Rule Manager; set composite title |
| **4** | **Configured Builds Orphaned on User Deletion**: Deleting user breaks build relationships | `configured-builds.ts` | Backend | **Medium** | Add `beforeDelete` hook to nullify or reassign user foreign key |
| **5** | **Sole Admin Demotion Vulnerability**: Last admin can demote themselves, locking out the console | `Users.ts` | Backend | **Medium** | Add `beforeChange` hook preventing demotion/deletion of the last active admin |
| **6** | **Unbounded Component Popularity Aggregation**: Aggregates in JS if order lines exceed threshold | `build-stats.ts` | Backend | **Medium** | Push component frequency aggregation directly into SQL query `GROUP BY` |
| **7** | **Negative Power Budget Allowed**: `baseWatts` lacks minimum boundary | `BuilderSettings.ts` | Backend | **Medium** | Add `min: 0, max: 2000` validation to `power.baseWatts` field |
| **8** | **Attribute Terms Deletion Lacks UI Confirmation**: Single click deletes term | `AttributeTermsManager.tsx` | UI/UX | **Medium** | Add confirmation modal with impact warning before firing DELETE |
| **9** | **Plugin Toggle Soft Reload Notice**: Toggling plugin leaves stale nav until hard refresh | `PluginsManagerView.tsx` | UI/UX | **Medium** | Display AlertBanner/Toast requesting reload or trigger soft router refresh |
| **10** | **Search Indexing Missing on Shipping & Tax Collections**: List search returns nothing | `shipping-bands.ts`, `tax-rates.ts` | UI/UX | **Low** | Add `listSearchableFields: ['name', 'country']` to admin configuration |

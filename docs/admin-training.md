# Admin Training — BuildMyRig

Who this is for: store managers and content admins operating the Payload admin at `/admin`. Covers day-to-day tasks, what each role may do, and the guardrails the system enforces.

## 1. Signing in and roles

- URL: `/admin` (local: `http://localhost:3000/admin`). You are redirected to `/admin/login` when not signed in.
- Seeded accounts (development only): `admin@buildmyrig.test` / `manager@buildmyrig.test` / `staff@buildmyrig.test`, password `Password123!`. Production accounts must be created by an admin; change seeded passwords immediately.
- Roles live on the **Users** collection: `admin`, `manager`, `staff`.

| Task | admin | manager | staff |
| --- | --- | --- | --- |
| Manage users, change roles, delete users | ✅ | ❌ | ❌ |
| Create/edit/delete products, variants, prices | ✅ | ✅ | ❌ (read-only) |
| Create/edit discount codes | ✅ | ✅ | ❌ (read-only) |
| Orders: view + status updates (fulfilment) | ✅ | ✅ | ✅ (status changes only) |
| Refunds / transactions | ✅ | ❌ | ❌ |
| Media uploads | ✅ | ✅ | ✅ |
| CMS pages + blocks (create/edit/publish) | ✅ | ✅ | ❌ (read-only) |
| Builder: components, categories, compatibility/power rules, templates, CSV import | ✅ | ✅ | ❌ (read-only) |
| Read customer **Configured Builds** | ✅ | ✅ | ✅ |
| Edit/delete any Configured Build | ✅ | ❌ | ❌ (own builds only) |
| Publish rules live to the storefront | ✅ | ✅ | ❌ |

Notes:
- Only an **admin** can change roles (including granting `admin`). A user editing their own profile cannot escalate their own role — the field is stripped for non-admins.
- Users see only their own record in list views; admins see everyone. Access to another user's record by URL returns **404**, not 403 (by design).

## 2. Catalogue — products, prices, discounts

> Admin + manager only — staff accounts have read-only access to this section.

- **Products** (`/admin/collections/products`): title, slug, description, brand, category, media gallery, and a **Builder** tab linking the product to configurator components (kept in sync automatically when a component references it).
- **Prices**: edit via the Prices collection — the storefront never trusts client-side prices; totals are recomputed server-side at add-to-cart and checkout, so a stale browser tab can't pay the wrong amount.
- **DiscountCodes**: percentage or fixed codes with validity windows. Test each code on `/checkout` after creating it.
- **Brands / Categories / Attribute types & values**: catalogue structure and faceting metadata; slugs drive URLs (`/shop/[categorySlug]`).

## 3. Media rules (important)

- Allowed upload types: **JPEG, PNG, WebP, AVIF** only.
- **SVG uploads are rejected** (stored-XSS protection) — convert logos/illustrations to PNG or WebP first.
- Only `admin`/`manager`/`staff` can upload; signed-out visitors get **403**.
- Recommended sizes: product image 1600×1200 or larger; brand logo 512px wide PNG.

## 4. Orders and customers

- **Orders** (`/admin/collections/orders`): status lifecycle is `processing → completed` (orders are created `processing` when the Stripe webhook settles payment), with `cancelled` / `refunded` as manager+ terminal states; the `pending → processing → succeeded / failed / cancelled / expired` lifecycle above belongs to **transactions** (payment state). Never mark an order completed manually to "fix" a payment; check the webhook delivery first (see §7). Staff/managers can move orders through fulfilment statuses — staff are limited to `processing`/`completed` (status-only write, entry 20 review); **refunds (transactions) are admin-only**.
- **Customers**: storefront buyers live in the `users` collection as customer-equivalent accounts; do not assign them `admin`/`manager` roles.

## 5. CMS pages and blocks

- **Pages** (`/admin/collections/pages`): create/edit/publish is **admin + manager only** (staff can read).
- Pages use **drafts**: edits save as drafts until you **publish**; only published pages are publicly readable (`/` and `/<slug>`).
- Each page is a stack of the 14 registered blocks (hero, rich text, testimonials, contact form, …) — the "Add block" drawer is grouped into **Layout / Commerce / Content**. Reorder blocks with drag handles; every block has an admin preview label.
- **Section** (Layout group) wraps other blocks in a band; its **layout** tab controls vertical padding, background tone and inner width (choices map to site theme tokens — pick, don't type). Sections can't nest inside sections.
- Rich-text blocks can embed a curated subset inline (product grid, category spotlight, CTA banner, templates carousel, video, newsletter) from the editor's block menu.
- **Contact form block** (Content group): drop it on a page and submissions go to the staff inbox email (`STAFF_ALERT_EMAIL`, else the configured sender) — no admin UI list. If no email is configured, submissions are logged instead of sent (dry-run).
- **Homepage**: exactly one page can have the **is Homepage** flag (ticking it clears the flag from any other page). The `/` route renders that page — with a built-in fallback landing if no homepage page exists yet. Revalidation is automatic on publish (no redeploy).
- SEO fields (meta title/description, social image) sit on each page/product; sitemap and JSON-LD regenerate from them.
- Newsletter signups (the **Newsletter signup** block — currently on the homepage) go straight to **Resend** (API-key based); there is no admin subscriber list.
- **Theme** (`/admin/globals/theme`): swap the storefront design with the **Preset** select (Precision Dark / Light / Midnight — Midnight also restyles buttons, cards and grid density, and pins its own radii). Changes go live within about a minute, no deploy needed. The color/radius/font fields below fine-tune the active preset — leave a field empty to keep the preset value (a preset that ships a skin may pin some of those values itself).

## 6. PC builder operations

- **Components** + **Component Categories**: the parts catalogue shown in the configurator. `required`/`maxSelectable` per category controls the guided flow.
- **Compatibility Rules** (slot-conflict grid): conflicts, requirements (e.g. cooler socket), cosmetic constraints. Messages shown to shoppers are interpolated — use `{component}` placeholders as authored.
- **Derived Power Rules** (Wattage): PSU recommendation math (`recommended PSU = GPU TDP + CPU TDP + headroom` style rules).
- **CSV import** (`/admin` → builder rules import endpoint): manager/admin only, zod-validated rows — bad rows are rejected with row-level errors; valid rows land immediately in the live index (no redeploy needed). Export the grid before a large import so you can roll back.
- **Build Templates**: the "Start from a template" cards on `/builder`; each slot pins a component; base price shown to shoppers.
- **Configured Builds**: customer build submissions. Staff can read all builds; only admins can edit/delete another person's build (deleting a customer's build is recoverable only from backups — prefer read-only).
- The public **builder index** (components + rules powering `/builder/configure`) is intentionally public; internal fields (prices of unpublished items, user data) are not exposed.

## 7. Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Login works but API calls from a script return `user: null` | CSRF origin allowlist — `BMR_URL` unset/mismatched | Set `BMR_URL` to the exact public origin (no trailing slash issues — both forms are accepted); scripts must send `Origin:` or `Sec-Fetch-Site:` |
| Upload fails 400 with an SVG/harmful-image message | SVG blocked by policy | Convert to PNG/WebP |
| Upload fails 403 | Signed out, or account lacks `admin`/`manager`/`staff` | Sign in with a staff account |
| A rule edit doesn't show in the configurator | You edited a draft/disabled rule, or the server index cached pre-edit state | Check the rule's published state; reload `/builder/configure`; the index rebuilds on save |
| Order stuck "placed" after payment | Stripe webhook not delivered (missing `STRIPE_SECRET_KEY`/webhook secret in `.env`, or local machine can't receive webhooks) | Check server logs for the webhook route; replay from the Stripe dashboard in test mode |
| "Too many requests" (429) on public endpoints | Built-in rate limits (e.g. 30/min save-build, 5/min newsletter) | Wait a minute; limits are per-instance and reset on server restart |
| 500 with a generic message | Errors are intentionally not leaked to browsers | Check the server log for the real message (logged server-side) |
| Concurrent schema jobs collide in dev | SQLite `push` not idempotent under races | Stop the dev server before running `payload run` scripts; retry once |

## 8. Safety rails (what the system will not let you do)

- Prices are always recomputed server-side — editing a price in the browser has no effect on what is charged.
- Checkout re-validates the configured build against the current rule set; an invalid build cannot be purchased.
- Roles can only be granted by an admin; self-escalation attempts are silently stripped.
- Media types are whitelist-only; SVG is never stored.
- Audit tip: destructive bulk actions (deleting many builds/rules) are not undoable — export CSV first (rules) or note the IDs (builds).

## 9. Getting help

- Plan/spec docs: `docs/buildmyrig-plan/` (access matrix: `11-access-security.md`, ops: `12-integrations-ops.md`).
- Progress/change log: `docs/buildmyrig-plan/18-progress-log.md`.
- Escalation owner: repo maintainer (env vars, Stripe, deployment).

# ADMIN_GUI mockup — delta vs the live Payload admin (2026-10-22)

Reference screenshots: `screenshots/admin-mockup/` (13 files, 1440 + 280 + dark + palette).
Live admin captures: re-run `node apps/web/e2e/audit-browser-verify.mjs` (writes
`apps/web/screenshots/audit/`); the harness now authenticates correctly.

## How to run the mockup

`ADMIN_GUI/` is a standalone Vite + React 19 + Tailwind 4 app (AI Studio export, state-based
routing — no URLs, navigate via the sidebar).

```
cd ADMIN_GUI
npm install --legacy-peer-deps     # vite 8 wants esbuild ^0.27; devDeps pins ^0.25
npx vite --port 3100               # 3000 is the real app
```

Measured: 0 horizontal overflow at 1440 and 280, 0 page errors, 1 React warning
(`value` without `onChange` in a form field).

## 1. Already at parity (the live admin absorbed these)

| Mockup surface | Live equivalent |
|---|---|
| 5-tab product editor (General & Media / Pricing & Margin / Inventory & Logistics / Hardware Specs / Builder Rules) | Same five tabs, same order |
| Right taxonomy sidebar: Category, Brand, Badge Ribbon, Warranty | Same four cards + `+` quick-create |
| Header actions: Versions, API, Preview, Save Draft, Publish | Same (Versions 6 / API / Preview / Save / Publish) |
| Category/Brand tables with COLUMNS ▾ / FILTERS ▾, search, pagination | `RegistryListHeader` + list-cell elevation plugin |
| Rule Matrix sandbox + enforcement registry | `RuleManagerView` + `RuleSandbox` |
| UI standards registry page | `DesignSystemView` |
| ⌘K command palette, collapsible sidebar, dark skin switcher | `CommandPalette`, `ModernAdminNav`, `ThemeColorStudio` |

## 2. Mockup features the live admin does NOT have

Ranked by value/effort:

| # | Mockup feature | Live state | Notes |
|---|---|---|---|
| ~~1~~ | ~~**Pricing & Margin live calculator**~~ | **PORTED** (`6e565c4`) | `ProductMarginPanel` + `computeMargin` in `packages/lib`; gross profit / margin % / MSRP strike-out, staff-only cost, unknown values render as an em dash |
| 2 | PDP bullet highlights as a **drag-reorder list with per-row delete** | Payload array field (add/remove, no drag) | `array` + `admin.components.RowLabel`; medium effort |
| 3 | **Media dropzone** with PRIMARY star, per-file dimensions/size, inline delete | Payload upload field (functional, no per-file metadata) | Payload's own upload UI is adequate; low priority |
| 4 | **High-density table density toggle + `Per Page` selector in the footer** | Payload list has per-page but no density toggle | Low effort, cosmetic |
| 5 | **Light "Enterprise SaaS" skin** as a first-class preset | Skins exist (`light-clean`, `aether-frost`) but the default is dark | Do not port the mockup's light palette blindly — see §4 |

## 3. Live-only surfaces the mockup lacks

Orders (24 in nav, placeholder page), Transactions, Discount Codes, Carts, Variants, Configured
Builds, Build Templates, Component Slots, Compatibility Rules, Builder Analytics, Plugins Manager,
Media Library, Pages, Users/RBAC, Mega Menu, Site & SEO settings, Store settings, Packaging tiers.

The mockup is a **product-catalog console**; the live admin is the full CMS. Parity work should
port §2 items into the live admin, never the reverse.

## 4. Defects found while comparing

| # | Where | Issue | Severity |
|---|---|---|---|
| D1 | Mockup | Dark mode never applies: Tailwind 4 `dark:` utilities key off `prefers-color-scheme`, and `index.css` has no `@custom-variant dark (&:where(.dark, .dark *))` — the `.dark` class and its tokens are dead code | Medium (mockup) |
| D2 | Mockup | Root uses hardcoded `bg-[#f8fafc] dark:bg-slate-950` instead of tokens | Low (mockup) |
| D3 | Live admin | The `json` field ("Raw Cosmetic Specs") rendered an unstyled white Monaco editor on the dark skin | Medium (live) — **fixed** `e32e6fa` |
| D4 | Live admin | Sidebar checkbox cards overlapped their label/description | Low (live) — **fixed** `e32e6fa` |
| D5 | Live admin | Products table is 1232px inside a 996px scroller at 1440 — ACTIONS needs horizontal scroll (verified: wrapper is `overflow-x: auto`, so reachable) | Observation |

## 5. Recommendation

D3/D4 shipped in `e32e6fa`, the margin calculator in `6e565c4`. Next up when the catalog UX round
starts: #2 (drag-reorder PDP bullets). Skip #3–#5.

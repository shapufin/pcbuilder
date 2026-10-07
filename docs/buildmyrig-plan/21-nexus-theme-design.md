# 21 — Nexus theme pack — design

Status: **implemented** — entry 71. Plan: `~/.devin/plans/plan-9980f28913a63396.md`.
Source: `shop layout/` AI Studio mock (~6.4k-line SPA) ported as a swappable
theme **pack**, not a hard fork — admin picks "Nexus" in the Theme global and
the storefront switches chrome + gains nexus surfaces while pages, blocks, nav
and globals stay admin-editable.

## The pack discriminator

`ThemePresetDef` gained `pack?: string` (`packages/plugin-pages/src/lib/theme.ts`).
`THEME_PRESETS.nexus` carries `skin: 'nexus.css'` + `pack: 'nexus'`;
`getThemeAssets()` (`apps/web/src/lib/theme.server.ts`, React `cache`d per
request) propagates `pack`; the root layout sets `data-theme-pack="nexus"` on
`<body>` and swaps `SiteHeader`/`SiteFooter` for `NexusHeader`/`NexusFooter`
when `theme.pack === 'nexus'`. Fonts Plus Jakarta Sans + JetBrains Mono load
as `--font-jakarta`/`--font-jetbrains` vars. The Theme global's `afterChange`
hook (`lib/theme-revalidate-plugin.ts`) revalidates the root layout so a preset
swap is visible immediately — no ISR wait.

## Two CSS layers (why they split)

- `packages/ui/skins/nexus.css` — **the skin**: overrides for surfaces that
  exist under every preset (PDP, shop grid/sidebar, cart drawer, checkout,
  packaging cards, product-card, buttons, inputs, scrollbar/selection).
  Injected into `<style id="theme-skin">` — which the visitor alt-theme
  toggle disables, so a visitor choosing light mode loses the dark-surface
  skin but keeps a coherent site.
- `apps/web/src/themes/nexus/nexus.css` — **the component layer**: all `nx-*`
  classes (header, mega menu, modals, cards, hero, explorer, rig visualizer,
  PDP extras), always bundled so the alt toggle never unstyles nexus chrome.
  Colors resolve through `var(--color-*)` preset tokens via `color-mix`, so
  the light alternate yields a light Nexus. `--nx-*` aliases are defined on
  `body[data-theme-pack='nexus']`. `prefers-reduced-motion` gates ambient
  animations (pulse, scanline, shake, particles).

## Ported surfaces

- **Header** (`NexusHeader` + `NexusHeaderClient`): telemetry strip from
  `site-settings.announcements`, catalog mega-menu (`mega-menu` global),
  ⌘K search modal (debounced `/api/products` hits → `/product/[slug]`,
  `/shop/search?q=` fallback), sound toggle persisted in `bmr_sound`,
  cart popover, mobile drawer. Preserves `role="banner"` + labelled
  search trigger so existing e2e contracts hold.
- **Blocks** (`packages/plugin-pages/src/blocks/nexus-*.ts`, renderers in
  `themes/nexus/blocks/`, wired in `blocks/registry.tsx`):
  `nexusHero` (gradient heading + dual CTA + lazy rig visualizer),
  `nexusCategoryMatrix` (icon cards w/ CSS circuit-trace → `/shop/[slug]`),
  `nexusProductRail` (category rail + `prebuilt-tier` chips + spec-meta
  chips), `nexusSlotExplorer` (interactive board — below). Page-level only:
  not added to `lexicalEmbedBlockSlugs`.
- **Slot explorer** (`blocks/NexusSlotExplorer.tsx` server +
  `client/NexusSlotExplorerClient.tsx`): slots resolve per-slot product
  overrides → first published product per mapped category
  (`lib/slot-explorer.server.ts`). First click mounts (canvas spark burst +
  sounds + board shake); clicking a mounted slot navigates to the product
  or its category — navigation-only, no add-to-cart (variant resolution
  lives on the PDP). "Configure in builder" CTA → `/builder`.
  Standalone route `/explorer` (`app/explorer/page.tsx`) is
  `force-dynamic` so preset swaps are e2e-testable without ISR waits.
- **PDP extras** (`NexusPdpExtras` + `lib/spec-meta.ts`): marketing meta
  keys (`spScore`, `goldenBin`, `delidded`, `colorHex/Name`, `formFactor`,
  `acousticFloor`, `thermalDelta`, `tdpWatts`, `features`) read from
  **product** `specsJson` (NOT the template-gated components.specsJson —
  that stays rule-critical). `NEXUS_META_KEYS` is excluded from the generic
  spec table via `specRowsExcept`. `colorHex` is whitelisted to literal CSS
  color syntax before it may reach `style` — admin JSON is untrusted.
- **Packaging tiers** (plugin-shop): `packaging-tiers` global (public read,
  manager write) + `POST /api/carts/:id/packaging` (owner-or-secret gated,
  rate-limited, rejects empty cart). The endpoint rewrites the cart's
  `lineType:'packaging'` line with `lineLabel` + `packagingTier`; the cart
  beforeChange hook re-resolves the tier price server-side and clamps
  quantity to 1 — the client never sends a price. `PackagingPicker` on
  checkout sits before payment initiation so the tier is inside the
  PaymentIntent; works for the €0 confirm-free path too. Cart/checkout/
  drawer/email label chains fall back `lineLabel ?? buildName ?? product`.
- **Rig visualizer** (`client/RigVisualizer.tsx`, ~960-line three.js port):
  `next/dynamic ssr:false` via `NexusRigLazy` — the three chunk (~555 KB)
  never ships in the entry bundle (verified against build-manifest).
  Drag-orbit + raycast hover-detach + click-extract → `router.push` to the
  mapped `/shop/[slug]` (labels: GPU/CPU/COOLING/MEMORY); re-click on an
  extracted part snap-mounts with the impact banner. 5 chamber-lighting
  themes via material `emissive` recolor. Reduced-motion: fan spin + RGB
  breathing pause; user-driven orbit/extract remain (purposeful motion).
  `0x` numeric materials pass the raw-hex lint; canvas texture fillStyles
  were rewritten to `rgb()/rgba()` for the same reason.

## Data & seed

- Fresh-DB seed sets `theme.preset='nexus'`, `site-settings.announcements`,
  `mega-menu` sections (3 columns incl. `/explorer` + prebuilt tiers),
  `packaging-tiers` (Standard/Armor/Pelican-style), a `Pre-Built Rigs`
  category + 3 prebuilt products faceted by the `prebuilt-tier` attribute,
  product-level `specsJson` (Nexus meta keys + real spec rows — fixes PDP
  "No specs listed"), Nexus-composed homepage (`pages-seed.ts`), and real
  jpgs from `src/seed-assets/` on 4 mapped products. Seed early-returns on
  existing DBs — existing installs keep their preset.
- `shop layout/` is `.gitignore`d — reference-only, never committed.

## Key decisions

- **Pack, not page variants** — blocks render under any preset (vars adapt);
  the chrome swap is the only pack-conditional surface. Avoids duplicating
  page content per theme.
- **Component CSS outside the skin** — the alt-theme toggle disables
  `#theme-skin`; if `nx-*` lived there, toggling would unstyle the header.
- **Navigation-only explorer/visualizer** — "pull GPU → land on /shop/gpus"
  keeps commerce in one place (PDP variants + builder compatibility).
- **Server-priced packaging** — client posts a tier *id*; the hook resolves
  `priceCents` and recomputes totals, same trust boundary as discounts.

## Verification

- Unit: plugin-pages theme/blocks tests, plugin-shop packaging tests; web
  218/218; typecheck 6/6; lint 4/4; build 25/25 routes (`/explorer` ƒ).
- e2e `nexus.spec.ts`: REST login → `POST /api/globals/theme` preset→nexus →
  `/explorer` asserts `data-theme-pack="nexus"` + `.nx-slot` DOM + builder
  CTA → restores prior preset.
- Lazy-chunk check: three.js chunk absent from `rootMainFiles`.

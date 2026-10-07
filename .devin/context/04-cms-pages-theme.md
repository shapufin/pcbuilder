# 04 — CMS pages, blocks, theme, site settings

Canonical docs: `docs/buildmyrig-plan/10-blocks-pages.md`,
`09-routes.md`, `13-performance-seo.md`, `07-ux-plan.md`.

## Architecture (entries 19–22)

- `packages/plugin-pages` (`pagesPlugin()` in `src/index.ts`) injects:
  globals `site-settings` + `theme` + `mega-menu` (entry 71), `config.blocks` via `mergeBlocks`
  (append+dedupe **before** payload sanitize — `enabled:false` still
  registers because Lexical `BlocksFeature` boot-resolves slugs), and
  wraps mini-plugins `plugins/seo-fields.ts` +
  `plugins/category-top-blocks.ts`.
- 18 block configs in `packages/plugin-pages/src/blocks/` (one file
  each + `slugs.ts` literal lists + `definitions.ts` assembler;
  `rich-text.ts` exports `richTextFeatures`). Entry 71 added the four
  `nexus*` blocks (hero/categoryMatrix/productRail/slotExplorer,
  `admin.group: 'Nexus'`, page-level only — not in
  `lexicalEmbedBlockSlugs`).
- Layout uses **references, not embeds**: `blocks: []` +
  `blockReferences` + **`filterOptions` as the server-side allow-list**
  (verified in payload's `validateBlocksFilterOptions`; pinned by #156).
- `Section` container: content tab = nested blocks field, layout tab =
  padding/background/width → **closed CSS-var lookup maps** in
  `apps/web/src/blocks/components/Section.tsx`. No recursion.
  `Columns` container (entry 74): same pattern horizontally — `columns`
  array (2–4) of nested blocks over `columnChildSlugs` (no section or
  columns inside), `layout` (equal/wide-left/wide-right edge-span) +
  `gap` selects → `data-*` attrs → `.blk-columns` grid (mobile stack).
- App render path: `apps/web/src/blocks/renderBlocks.tsx` (shared walk)
  → `PageRenderer.tsx` → `registry.tsx` (fs-scan test pins key:value
  pairs). `collections/Pages.ts` wires the layout field.

## Lexical RichText — critical contract

- Converters MUST be passed as a **function**:
  `({ defaultConverters }) => ({ ...defaultConverters, ... })`.
  A plain object replaces `defaultJSXConverters` → every paragraph
  renders "unknown node" (entry-22 HIGH F1; regression test `#155`).
  Wrapper: `lexicalRichTextConverters` in
  `apps/web/src/blocks/lexical-converters.tsx`.

## Theme system

- `packages/ui/tokens.css` is the **single definition site** (18 colors
  + radius/spacing/text/shadows/motion). Component CSS must use
  `var(--*)` — the `no-raw-hex` eslint rule enforces it on
  `apps/web/src/**` (tests exempt; shared rule data
  `apps/web/eslint-rules/no-raw-hex.mjs`, tests `#140/#142/#140c`).
  **Exceptions** (literal hex allowed, documented): email templates,
  `RuleManagerView`.
- `theme` global: `packages/plugin-pages/src/globals/Theme.ts`
  (preset select + per-field overrides, manager-only update).
  `lib/theme.ts` `resolveTheme` re-validates **every** value before it
  reaches the inline `<style>`; empty/invalid → preset default.
- **Design swap (entry 49)**: `THEME_PRESETS` in `lib/theme.ts` is the
  preset registry (`{label, colors, extras, skin?}`); the admin select
  options come from `themePresetOptions()` (parity test `#288`).
  `Theme.extras` = preset-tuned additive vars (scrim/glow/soft/accent/
  focus) emitted as `--color-*`; every preset must carry the same
  extras key set (`#288`). **Skins**: preset `skin` →
  file in `packages/ui/skins/` → `loadSkin` (cached, `</style`-guarded)
  → `<style id="theme-skin">` after the vars; layout calls the
  single-fetch `getThemeAssets()` (all never-throw → defaults/`''`).
  Adding a design = registry entry + optional skin file.
- **Theme packs (entry 71)**: `ThemePresetDef.pack?: string` — preset
  `nexus` carries `pack: 'nexus'`; `getThemeAssets()` propagates it and
  `(frontend)/layout.tsx` sets `body[data-theme-pack]` + swaps chrome to
  `NexusHeader`/`NexusFooter` when `pack === 'nexus'`. Nexus ships TWO
  CSS layers: skin `packages/ui/skins/nexus.css` (shared surfaces —
  dies with the visitor alt-toggle by design) + always-bundled
  `apps/web/src/themes/nexus/nexus.css` for `nx-*` component styles
  (token-only, `color-mix` glows → light alt yields a light Nexus).
  Design doc: `docs/buildmyrig-plan/21-nexus-theme-design.md`.
- **Mega-menu + announcements (entry 71)**: `mega-menu` global
  (`globals/MegaMenu.ts` + `lib/mega-menu.ts` resolver — closed icon
  set, `isSafeNavLinkUrl`, default fallback) feeds the Nexus catalog
  flyout; `site-settings.announcements[]` feeds the telemetry strip.
  App-side `lib/theme-revalidate-plugin.ts` revalidates the root layout
  on theme/site-settings/mega-menu changes (keeps `next/cache` out of
  plugin packages).
- **rig-dark is the default (entry 51)**: `tokens.css` statics ARE the
  RIG palette — `DEFAULT_THEME.preset`/`resolveTheme` fallback/`Theme`
  `defaultValue` all `'rig-dark'`; drift guards `#139c`/`#292` pin
  rig-dark↔tokens parity (dark preset is a *swappable non-default* —
  don't re-pin its values to tokens.css). Stored docs keep their preset
  until an admin re-selects. Fonts: `next/font/google` Inter→
  `--font-inter`, Space_Grotesk→`--font-space-grotesk` ((frontend)/layout.tsx,
  fetches at build/dev — CI needs network); `--font-sans`/`--font-display`
  wrap the vars, `--font-mono` stays true mono.
- App injection: `src/lib/theme.server.ts` `getThemeCss()` →
  `src/app/(frontend)/layout.tsx` renders `<style id="theme-vars">` as first body
  child (overrides win cascade after the tokens.css import).
- **Visitor toggle (entry 60)**: `getThemeAssets()` also returns `altCss`
  — a complete counterpart preset (`altThemePreset()`: `light`↔
  `dark`-flavored; preset defaults, admin overrides do NOT leak; admin
  radius/fonts kept) — rendered inert as `<style id="theme-alt"
  media="not all">`. `ThemeToggle` (header, `useSyncExternalStore`, no
  setState-in-effect) flips `media` attrs + stores `bmr_theme`
  (`'alt'`/`'default'`); `THEME_BOOT_SCRIPT` inline after the style tags
  re-applies before paint. Own-tab writes notify via `bmr_theme_change`
  (storage events don't fire same-tab). `#402–#408` + e2e. The three theme
  style tags carry `suppressHydrationWarning` (entry 63) — the boot script
  mutates their `media` attrs pre-hydration by design. The drawer/panel
  ids in `FilterDrawer` use `useId` (entry 63) so two drawers can't
  collide on `aria-controls`.
- Payload group-field semantics: validators see *omitted* group fields
  as empty on PATCH — optional fields must accept empty (`optionalField`
  pattern, `#141b`); `{"colors":{}}` merges as a no-op — clear with
  `""`/`null`; global update is `POST /api/globals/theme`.
- **Theme packs (entry 71)**: `ThemePresetDef.pack?: string` — the
  `nexus` preset carries `pack:'nexus'` + `skin:'nexus.css'`.
  `getThemeAssets()` propagates `pack`; layout sets
  `data-theme-pack` on `<body>` and swaps `NexusHeader`/`NexusFooter`
  for the default chrome when `pack==='nexus'`. Theme `afterChange`
  revalidates the root layout (`lib/theme-revalidate-plugin.ts`) — no
  ISR wait on preset swap. **Two CSS layers**: `packages/ui/skins/
  nexus.css` = skin (dies with the visitor alt-toggle by design);
  `apps/web/src/themes/nexus/nexus.css` = always-bundled `nx-*`
  component layer (token colors only — never lives in the skin or the
  toggle would unstyle the chrome). Nexus blocks
  (`nexusHero`/`nexusCategoryMatrix`/`nexusProductRail`/`nexusSlotExplorer`)
  render under any preset. Standalone `/explorer` is `force-dynamic`.
  `packaging-tiers` global + `POST /api/carts/:id/packaging` +
  `mega-menu` global; RigVisualizer lazy-loads three.js via
  `next/dynamic ssr:false`. Design doc: `docs/buildmyrig-plan/
  21-nexus-theme-design.md`.
- New globals/blocks need `pnpm payload -- generate:types` + one
  `pnpm dev` boot (schema push — see 05).

## Site settings & navigation

- `site-settings` global: nav/footer `label`+`url` arrays with URL
  validation (backslash bypass `/\evil.com` fixed, `#102`).
  Resolver: plugin `lib/` + app `src/lib/site-settings.server.ts`
  `getSiteSettings()` (never throws; defaults while no doc). Header/
  footer render in `(frontend)/layout.tsx` + `SiteFooter.tsx` (both async).
- `seed-pages` is idempotent-by-slug — it **skips existing pages**;
  content edits to seeds won't reach an existing dev DB (patch via
  admin REST `PATCH /api/pages/:id` or reseed fresh).
- Search `/shop/search`: `sanitizeSearchQuery` strips LIKE metachars →
  payload `contains`, published-only (`src/lib/search.ts` `#105–107`).
- Wishlist: zustand persist `bmr-wishlist-v1`, `skipHydration` +
  hydration effect, cap 50 (`src/lib/wishlist-store.ts`).

## Admin components

- New `components.views`/`afterNavLinks`/`components.Field`/`RowLabel`
  specifiers require `pnpm payload -- generate:importmap` (dev server
  stopped) or the route 500s on the missing specifier. The generated
  `importMap.js` imports `@payloadcms/plugin-seo/client` — keep that dep
  in apps/web. Specifier convention (relative to `apps/web/src`):
  `'../../../packages/<pkg>/src/admin/<Comp>#<Comp>'`.
- plugin-pages admin client components (entry 73):
  `src/admin/MegaMenuPreview.tsx` (ui-field live flyout mock —
  `useForm().getDataByPath('sections')` → real `resolveMegaMenu`,
  promo thumbs via `/api/media/:id`) + `MegaMenuRowLabel.tsx`
  (`useRowLabel()`); package tsconfig carries `"jsx": "react-jsx"` +
  `react`/`@types/react` devDeps (mirror pc-builder; `@payloadcms/ui`
  resolves transitively).

## Verify

- `pnpm test` (plugin-pages suite `#112–116`, `#144–155`); hex rule:
  `pnpm lint`.
- Live probe: admin PATCH theme → storefront shows override after ISR
  window (`/` = 60 s; first post-expiry fetch can serve stale-while-
  revalidate).

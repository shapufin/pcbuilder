# 22 — Admin GUI design system (RIG Studio Admin)

Status: **canonical spec** — entry 90. Source mockup: `AdminGUI/` (AI-Studio
Vite+Tailwind reference app, gitignored — read-only, never imported).
Router: `.devin/rules/CONTEXT.md` task table; lazy context:
`.devin/context/04-cms-pages-theme.md` § "Admin components & GUI architecture".

This doc is the single source of truth for **admin-panel** design and
component standardization. Storefront design tokens live elsewhere
(`packages/ui/tokens.css`, doc 07, doc 21) — do not mix the two systems.

## 0. What the mockup contributes (and what it does not)

The `AdminGUI/` mockup is a generic enterprise admin ("DMF" HR domain) —
its **pages are irrelevant**; its value is the standardized component
layer: variant-driven primitives, a strict data-table contract, a
collapsible-workspace shell, and explicit ergonomic rules. Its original
`Design.md` was already written against our codebase names
(`ModernAdminNav`, `ProductSpecFields`, `RuleMatrixView`) but specifies
**Tailwind utility classes literally — that cannot be adopted verbatim**
(see §1). This doc re-expresses every contract in our token + plain-CSS
idiom. Adopted:

1. Variant-driven primitive library (cva + clsx over `--theme-*` tokens).
2. Six ergonomic contracts (§3).
3. High-density data-table standard incl. floating batch bar (§6).
4. Shell patterns: footer theme picker, sidebar user card, toast system,
   command palette (§4, §8).
5. Interaction budget: sub-150 ms, spring/cubic-bezier easing (§7).

Rejected: Tailwind itself, raw-hex utilities, `recharts` (no chart need
yet — decide per view), `motion` (we already ship `framer-motion`).

## 1. Hard constraints (stack reality)

- Payload 3.90.2 admin runs **inside our Next.js 16 app** as React 19
  server+client components under `apps/web/src/app/(payload)/`.
- **No Tailwind.** Plain CSS only. Raw hex is banned in `src/**/*.{ts,tsx}`
  (ESLint `no-raw-hex`) — hex lives exclusively in `admin.css` token
  blocks and nowhere else. (`admin.css` is the admin-side *definition
  site*; `css-token-purity.test.ts` covers frontend sheets only.)
- **`useSyncExternalStore` for all `localStorage`/external reads** —
  `typeof window !== 'undefined'` branches caused hydration mismatches
  (entry 89). SSR snapshot + post-hydration sync, never conditional render.
- New `admin.components.*` / `views` / `Field` / `RowLabel` specifiers
  require `pnpm payload -- generate:importmap` (dev stopped) or the route
  500s (`.devin/context/04` § admin).
- Allowed deps for admin UI: `clsx`, `class-variance-authority`,
  `framer-motion`, `lucide-react` (all installed). **Do not** add
  `@payloadcms/ui` internals beyond documented exports.
- File layout: custom admin components in
  `src/app/(payload)/admin/components/`; the new primitive library in
  `src/app/(payload)/admin/ui/` (§5); primitive styles in
  `src/app/(payload)/admin/ui/ui.css`, imported by
  `(payload)/layout.tsx` **after** `admin.css`.

## 2. Token system & admin skins (as built)

`admin.css` defines the `--theme-*` namespace, skin-switched via
`[data-admin-theme]` on the admin root (`AdminHeaderActions` +
`AdminThemeSync`, persisted `localStorage` + cookie):

| Skin | `data-admin-theme` | Character |
| --- | --- | --- |
| Modern Slate Dark (default) | `precision-dark` | deep slate, sky accent |
| Enterprise SaaS Light | `light-clean` | pure white, sky-600 accent |
| Cyber Neon | `cyber-neon` | near-black + cyan/teal neon |
| Classic Payload | (no attr) | stock Payload theme, no overrides |

Token groups: `--theme-bg`, `--theme-elevation-{0..1000}` (Ramp — dark
themes map 0=deepest, light themes map 0=lightest; always reference
elevation steps, never a specific step's appearance),
`--theme-text{,-secondary,-muted}`, `--theme-accent{,-hover,-contrast,-glow,-soft}`,
`--theme-{success,warning,error,info}{,-soft}`, `--theme-border{,-strong}`,
`--theme-input-bg`, `--theme-radius-{sm,md,lg}`.

**Mockup → token mapping** (translate any Tailwind spec before use):

| Mockup (Tailwind) | Ours |
| --- | --- |
| `bg-white` / `bg-slate-900` card | `var(--theme-elevation-50)` |
| `bg-slate-50`/`bg-slate-100` | `var(--theme-elevation-100)`/`-150` |
| `border-slate-200`/`border-slate-800` | `var(--theme-border)` |
| `text-slate-900`/`text-slate-50` | `var(--theme-text)` |
| `text-slate-500`/`text-slate-400` | `var(--theme-text-secondary)`/`-muted` |
| `bg-blue-600` primary action | `var(--theme-accent)` + `--theme-accent-contrast` text |
| `bg-blue-50`/`bg-blue-950` subtle | `var(--theme-accent-soft)` |
| `rose-600`/`emerald-600`/`amber-500` | `var(--theme-error)`/`-success`/`-warning` (+`-soft` bg) |
| `bg-slate-900` floating bar | `var(--theme-elevation-950)` (inverse) |
| `rounded-lg`/`rounded-xl` | `var(--theme-radius-md)`/`-lg` |
| `font-mono tabular-nums` | `font-family: ui-monospace…` + `font-variant-numeric: tabular-nums` |

## 3. Ergonomic contracts (adopted, non-negotiable)

1. **Zero-pill metadata**: dates, categories, counts, slugs render as
   unboxed text separated by `·`. Rounded pill badges are reserved for
   *functional status* (`Published`, `Draft`, `Active`, `Live`).
2. **60-30-10 color budget**: ~60 % neutral canvas, ~30 % structural
   surfaces/borders/muted type, ~10 % accent (primary actions, active
   nav, focus rings). Accent is never a background wash on large areas.
3. **Single-elevation depth**: flat surfaces + 1 px hairline border +
   `shadow-2xs`-grade shadow. Never nest a bordered card inside a
   bordered card.
4. **Spatial math**: container padding ≥ inner gaps (min 16 px);
   button `padding-inline ≈ 2× padding-block`.
5. **Tabular numerals**: all money, timestamps, dimensions, counts →
   `font-variant-numeric: tabular-nums` (mono font for dense numeric
   columns) — prevents row jitter.
6. **Sub-150 ms interactions**: hover/toggle/modal entrances settle in
   100–150 ms, `cubic-bezier(0.16, 1, 0.3, 1)`; `active: scale(0.98)`
   press feedback on buttons.

## 4. Shell architecture (as built → target)

Three zones, already live:

- **Left rail** `ModernAdminNav` — brand lockup, ⌘K quick search,
  5 collapsible workspaces (Store & Commerce / PC Builder Engine /
  Content & Media / Settings & Design / Access & System), badge counts,
  full↔rail (68 px) toggle persisted `bmr_admin_rail`, mobile drawer.
  *Target (mockup)*: move theme picker + user/logout card into the nav
  footer (currently theme select lives in `AdminHeaderActions` top bar).
- **Top bar** — breadcrumbs, admin-skin select, Storefront ↗, account.
- **Viewport** — `<main>`; view content only, page chrome stays in shell.

## 5. Primitive library spec — `admin/ui/`

New shared primitives, BEM classes prefixed `bmr-`, variants composed
with **cva + clsx** (no utility classes in JSX — class names only):

```tsx
// admin/ui/Button.tsx — contract shape for every primitive
const buttonVariants = cva('bmr-btn', {
  variants: {
    variant: {
      primary: 'bmr-btn--primary',   // accent bg, accent-contrast text
      secondary: 'bmr-btn--secondary',
      outline: 'bmr-btn--outline',
      ghost: 'bmr-btn--ghost',
      destructive: 'bmr-btn--destructive',
      subtle: 'bmr-btn--subtle',     // accent-soft bg, accent text
      link: 'bmr-btn--link',
    },
    size: { sm: 'bmr-btn--sm', md: '', lg: 'bmr-btn--lg', icon: 'bmr-btn--icon' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})
```

| Primitive | Contract highlights |
| --- | --- |
| `Button` | variants above; `h-9` md (36 px), `h-8` sm, `h-11` lg, square `icon`; `active:scale(0.98)`; `forwardRef`; `href` prop → renders `<Link>` |
| `Badge` | status-only pills: `success/warning/danger/info/muted`; **never** for metadata (contract §3.1) |
| `Card` (+Header/Title/Description/Content/Footer) | hairline border, `radius-lg`, soft shadow; `hoverEffect` opt-in lift |
| `Input`, `Textarea`, `Select` | 38 px min-height; label `text-xs font-semibold`; required `*` in error color; prefix/suffix slots; helper vs error text; focus ring = accent-glow |
| `Checkbox`, `Switch` | 18 px box / 44×24 px track; accent when on |
| `Table` compound (`Table/Header/Body/Row/Head/Cell/Footer`) | §6 contract baked in: sticky head, `text-xs`, tabular-nums numeric variant |
| `Dialog`, `Sheet` | modal + right slide-over (create/edit forms); `scaleIn`/`slideInRight` 150 ms |
| `Tabs` | underline-style active indicator (matches product edit) |
| `Tooltip` | label on icon buttons; 150 ms |
| `Toast` + `ToastProvider` | bottom-right stack, success/info/error variants, auto-dismiss |
| `Progress`, `Separator`, `EmptyState`, `Skeleton` | small utilities; `EmptyState` mandatory for zero-row tables |

Rules: primitives are `'use client'` where interactive; all colors via
`var(--theme-*)`; no hex, no inline `style={{ color }}` for themed values;
layout-only inline styles tolerated but **new code prefers classes**
(`PluginsManagerView`'s ~100 inline style objects are the anti-pattern
this library retires).

## 6. Data-table standard

Applies to Payload list views (styled via `admin.css` overrides) **and**
custom-view tables (`bmr-table`):

- Wrapper: `elevation-50` surface, hairline border, `radius-lg`,
  `overflow-x:auto`, `min-width:680px`.
- Header: `elevation-100` bg, 11 px uppercase semibold muted, `h-10`,
  sticky on scrollable bodies, uniform color across cells.
- Cells: `text-xs`, `px-3.5`; numeric → tabular-nums.
- Rows: `divide-y` hairlines, hover `accent-soft` tint, `selected` state.
- **Floating batch bar**: ≥1 checked rows → fixed bottom-center
  high-contrast bar (`elevation-950` inverse) with count + actions +
  deselect. (Payload's own bulk bar on stock lists; `bmr-table` ships
  its own for custom views.)
- Pagination footer: left `< >` + page buttons; right
  `1–10 of N` + per-page select.
- Empty state: `EmptyState` spanning all columns — message + next action,
  never a blank table.

## 7. Motion

`framer-motion` (already installed; mockup's `motion` is the same API):
nav active-indicator `layoutId` spring (`bounce 0.18, duration 0.35`),
page/section entrances `fadeIn`/`slideUpFade` ≤ 220 ms,
`AnimatePresence mode="wait"` for view swaps. Respect
`prefers-reduced-motion` — ambient loops (pulse glows) must gate off
(frontend precedent: `motion.test.ts`, nexus skin).

## 8. Domain views map (as built → spec)

| Surface | Status |
| --- | --- |
| Command Center dashboard | Built — KPI cards, quick actions, 4 domain hubs |
| Product edit (5 tabs + taxonomy sidebar) | Built — doc header, Versions/API/Publish, `ProductSpecFields`, Builder Rules tab |
| Collection list views | Built — registry `beforeList` headers + `_bmr*` table cells (12 slugs), mock layout |
| Plugins & Extensions (`/admin/plugins`) | Built — card grid, status pills, tabs, search; **migrated to primitives** |
| Rule Matrix (`/admin/compatibility-rules-manager`), Build Stats | Built — live `RuleSandbox` over `/api/builder/index`; real KPIs |
| Attribute Terms manager | Built (`AttributeTermsManager`) |
| Primitive library `admin/ui/` | **Built** — ~20 primitives (Button, Badge, Card, Input, Dialog, Sheet, Toast, Table, Tabs, CommandPalette…) + `ui.css`, zero raw hex |
| Toast system, CommandPalette (⌘K), Sheet/Dialog | **Built** — `ToastProvider` in layout, palette mounted globally w/ action catalog |
| Nav-footer theme picker + user card | **Built** — Dark/Light/Cyber/Classic segmented picker + Administrator card |
| Slide-over creates (`CreateDocDrawerButton`) + Design System view | Built — 7 list headers, `/admin/design-system` |

## 9. Payload integration guide

- Register via `payload.config.ts` `admin.components` (`Nav`, `views`,
  `dashboard`, field `Field`/`RowLabel`) then `generate:importmap`.
- Client components needing `useForm`/`useRowLabel` follow
  `ProductSpecFields`/`MegaMenuPreview` precedents.
- Every storage read → `useSyncExternalStore` (§1).
- New admin views get a unit test alongside (precedent:
  `ModernAdminNav.test.tsx`, `admin-theme.test.tsx`).

## 10. Verification

Doc-only entry; gates: `pnpm workflow:check`. When primitives land:
TDD per primitive (class contract tests like `primitives.test.tsx`
frontend), then gate trio.

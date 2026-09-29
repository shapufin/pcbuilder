# 07 · Screen-by-Screen UX Plan

Component names are actual React components to build in `apps/web` / `packages/ui`. Props shown for key components. No visual design yet — structure, states, and animation specs only.

> **Implementation status (2026-09-28, Phase 2d)**: §1 (`/builder`), §2 (`/builder/configure`) and the §3 summary shell are live: `apps/web/src/app/builder/` (landing client, Zustand draft store, step flow, option cards, build rail, summary). Implemented with framer-motion + zustand; styles are token-named classes in `builder/builder.css` (repo uses inline styles/CSS vars, no Tailwind). Phase 2e completed the §3 CTAs: Share (save → copy `/build/[shareId]`), Add-to-cart (`POST /api/carts/:id/add-build` composite line), Save (disabled — no auth UI yet); `/build/[shareId]` public page + "Duplicate this build" → `?build=` draft hydration. **Phase 3 (2026-09-28)**: §7 marketing pages live (`app/[slug]/page.tsx`, ISR 60s, block-rendered), §4 animations landed — cart badge pop (`components/CartBadge`), add-to-cart chip flight (`lib/fly-to-cart.ts`, product + builder summary, 350ms, reduced-motion aware), share-copy label pop; CartDrawer slide-out + dialog/sheet scale remain pending with their components (FilterDrawer/CartDrawer not built yet). Not yet: virtualized option list, price-range/spec facets in `OptionsFilterBar` (search + brand chips only), out-of-stock badges + `SuggestAlternative` (needs stock data), accordion "power mode", §8 build stats view.

## Recommendation: step-based builder (vs single-page accordion)

**Recommendation: step-based** (one category per step). Justification: (a) 10 slot types make a single accordion page ~10 accordions × ~50 options = cognitively heavy; (b) steps give natural animation beats and a progress narrative; (c) each step's option list gets full width for spec cards + filters. Accordion view ships as a Phase 2 "power mode" toggle — the Zustand store is view-agnostic, so this is cheap.

---

## 1. Builder landing `/builder`

Layout: three choice cards + template carousel.
Component tree:
```
BuilderLandingPage (RSC, fetches templates via Local API)
├── BuilderChoiceHero
│   ├── StartFromScratchCard   (props: onSelect → navigate /builder/configure?mode=scratch)
│   ├── GuidedModeCard         (opens GuidedQuestionsDialog)
│   └── StartFromTemplateCard  (scrolls to carousel)
├── GuidedQuestionsDialog (client) — 3–4 questions: budget slider, use case select, performance tier, (optionally) aesthetic
│   └── maps answers → nearest BuildTemplate (budget×use-case scoring) → shows suggestion + "Start with this"
└── TemplateCarousel (client, framer-motion)
    └── TemplateCard ×n (image, tags, price, "Use this build")
```
States: loading (skeletons), empty templates (CTA to scratch), error (retry banner).

## 2. Step-based builder `/builder/configure`

Layout: left = current step (options list, 60%), right = persistent build rail (selected parts, price, warnings) that stays mounted.
Component tree:
```
ConfiguratorPage (RSC shell: server-fetches BuilderIndex JSON + build draft if resumed)
└── ConfiguratorProvider (client: Zustand persisted store, hydrates index)
    ├── StepNavigation (progress indicator, required/optional badges, back/next)
    ├── StepPanel (AnimatePresence: slide/fade on step change)
    │   ├── StepHeader (category icon, helperText, skip control if !required)
    │   ├── CurrentSelectionCard (image, name, spec chips, price delta vs previous pick, "Change" affordance)
    │   ├── OptionsFilterBar (search, brand chips, price range, spec facets per category)
    │   ├── OptionsList (virtualized)
    │   │   └── OptionCard ×n (props: spec entry, price, compatible | excluded | warned state)
    │   │        excluded → disabled style + WhyIncompatibleTooltip
    │   └── OptionsListStates: loading (index hydration), error (retry), empty filters (reset chips)
    └── BuildRail (sticky)
        ├── SlotList ×categories (SelectedPartChip or "Pick a …" empty slot, optional slots skippable)
        ├── LivePrice (animated number, framer-motion useSpring)
        ├── WarningsPanel (list of engine warnings + power chip "recommended PSU ≥ X W")
        └── ContinueToSummaryButton (disabled until required slots valid)
```
Key behaviors: compatible options live-filtered by client engine on every selection; excluded cards dimmed with reason tooltip (`explainIncompatibility`); out-of-stock mid-build (A11: stock check at step entry via lightweight endpoint) → card gets "Out of stock" badge + SuggestAlternative list (nearest same-category, same-rule-valid, sorted by price proximity).

## 3. Summary / checkout prep

```
BuildSummaryPage
├── BuildSheetTable (category rows, component, unit price, qty)
├── PriceBreakdown (component sum, build discount hint, tax note)
├── WarningsList (from server validationSnapshot — displayed even if client agreed)
├── ShareBuildButton (POST /api/builder/builds → shareId → copy URL /build/[shareId])
├── SaveBuildButton (auth-gated; guests prompted)
└── AddToCartButton (composite line item; success → cart drawer pop with animation)
```

## 4. Cart & checkout

`/cart`: `CartDrawer` + `CartTable` (standard lines, composite lines expandable to sub-items), quantity steppers, discount field (`POST /api/discounts/validate`), totals from server response. `/checkout`: Stripe hosted checkout (session created by `POST /api/checkout`); address entered at Stripe. `/order/confirmation/[id]`: order recap, status=pending until webhook confirms (polls once).

## 5. Shop screens

`/shop/[categorySlug]`: RSC listing + `FilterSidebar` (desktop) / `FilterDrawer` (mobile), URL-driven search params, per-filter counts, sort select, `PaginationControls`; empty state with "clear filters". `/shop/search?q=`: same grid, query-driven. `/product/[slug]`: `ProductGallery` (thumbs + zoom), `SpecTable` (typed specs section + specsJson section), `VariantPicker` (if >1), `StockBadge`, `CompatibilityHint` (from compatTags), `RelatedProducts`, `AddToCartButton`.

## 6. Auth & account

`/auth/login|register|reset`: simple centered forms (Payload auth). `/account`: tabs — Orders, Addresses, SavedBuilds. `/build/[shareId]`: read-only BuildSummaryPage (no cart CTAs for guests beyond "Duplicate this build").

## 7. Marketing

`/about`, `/contact` (form → Resend), `/faq`, `/terms`, `/privacy`: block-composed Pages.

## 8. Admin custom views

- **Compatibility Rules manager**: grid (columns Subject / Type / Operator / Field / Value / Target / Severity / Enabled), inline edit, add/duplicate row, filter chips, CSV import dialog (upload → zod validation → preview diff → commit), CSV export. Details in [04-collections/compatibility.md](04-collections/compatibility.md).
- **Per-component Conflicts field**: live table on Component edit, grouped by target category, links to conflicting docs.
- **Build Stats view**: cards — revenue, orders, popular templates, completed builds, low-stock components (consumes `shop:low-stock` events). Simple Payload custom view, no BI tool in v1 (A12).

## Design tokens starter (`packages/ui/tokens.css` — names only, values are the starting palette)

```css
--color-bg, --color-surface, --color-surface-raised, --color-border,
--color-text, --color-text-muted, --color-primary, --color-primary-hover,
--color-success, --color-warning, --color-danger, --color-info,
--radius-sm (4px), --radius-md (8px), --radius-lg (12px), --radius-full,
--space-1..--space-12 (4/8/12/16/24/32/48/64/96/128/160/192),
--text-xs..--text-4xl (12/14/16/18/20/24/30/36/48/60),
--shadow-sm, --shadow-md, --shadow-lg,
--ease-out (cubic-bezier(.16,1,.3,1)), --duration-fast (150ms), --duration-base (250ms), --duration-slow (350ms)
```
No raw hex in components — token names only. Rule: components may read tokens, never define values.

## Animation spec (Framer Motion, all durations/easings from tokens)

| Interaction | Motion |
| --- | --- |
| Step transition | slide-x 24px + fade, `--duration-base` (250ms), `--ease-out` |
| Option list entry | stagger 30ms/card, y 12px + fade, `--duration-base` |
| Card hover | translateY(-4px) + `--shadow-md`, 150ms |
| Price counter | `useSpring` number tween, 350ms |
| Add-to-cart | rail chip flies to cart icon (layoutId), 350ms; cart badge pop 150ms |
| Excluded card | opacity .45 + dashed border (no motion on disabled — a11y) |
| Dialog/sheet | scale .96→1 + fade 200ms |

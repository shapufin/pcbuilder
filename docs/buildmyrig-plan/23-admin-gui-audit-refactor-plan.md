# 23 — Admin GUI Audit & Ergonomic Refactor Plan

**Status**: APPROVED by User (2026-11-08)  
**Primary Surface**: Payload 3.x Admin GUI (`apps/web/src/app/(payload)/`) + Shop/Builder Plugins (`packages/plugin-shop/`, `packages/plugin-pc-builder/`)  
**Design Reference**: Mockup prototype `buildmyrig-studio-admin---modern-cms-&-pc-engine-console` (`ADMIN_GUI`)  
**Standards**: `/design` Anti-Slop Discipline, `/full-audit` Calibration, Plain-CSS Design Tokens (No Tailwind, No Raw Hex)

---

## 1. Problem Statement & Scope

A live browser audit against the authoritative mockup identified several critical UI/UX and ergonomic friction points on the modernized Admin GUI:
1. **Product Edit Ergonomics**:
   - The right taxonomy/metadata sidebar is fixed at 330px, forcing the main document form into a narrow ~640px viewport.
   - Form tabs overflow horizontally, producing an unstyled, thick Windows OS scrollbar track (`< [ ===== ] >`).
   - Hardware options and specs are cramped horizontally.
   - "Raw Cosmetic Specs (JSON)" displays an ugly raw code/JSON input box at the bottom of the tab despite `ProductSpecFields` handling this data cleanly.
   - The Pricing tab has disjointed, unstyled checkboxes and loose number inputs with confusing cent vs. euro helpers.
2. **Collection Table Standards**:
   - Multi-column tables (`compatibility-rules`, `inventory-reservations`, etc.) force rigid column max-widths (`max-width: 95px`), clipping column sort headers into `SUBJEC...`, `TY...`, `OPE...`, `SE...`, `E...`.
   - Elevated collection list views display an awkward double header (the custom rich telemetry banner followed immediately by Payload's native collection `<h1>` and `Create New` button).
   - Selection checkboxes in table cells lack vertical centering and proper padding.
   - Spacing/distance between header controls and the table is inconsistent.
   - Compatibility rule list rows display `<No Title>` on seeded records.

---

## 2. Implementation Batches

### Batch A — Product Edit Layout, Tabs & Pricing Overhaul
* **A.1. Wide Form & Repositioned Sidebar (`admin.css`)**:
  - Allow `.document-fields` to give `.document-fields__main` 100% of the available width.
  - Position `.document-fields__sidebar-wrap` below the main form tab content.
  - Transform `.document-fields__sidebar-fields` into a spacious, responsive 3–4 column grid of clean cards (*Category*, *Brand*, *Product Badge Ribbon*, *Warranty Coverage*, *Google SERP Preview*).
  - Eliminates horizontal squeeze on all form controls and tab bars.
* **A.2. Anti-Slop Tabs Navigation (`admin.css`)**:
  - Enforce `scrollbar-width: none;` and `-webkit-overflow-scrolling: touch;` on `.tabs-field__tabs`.
  - Apply clean, proportional tab button padding (`10px 16px`), eliminating the Windows scrollbar track.
  - Active tab receives solid accent underline with zero jitter.
* **A.3. Conceal Redundant Raw JSON Box (`plugin-shop` & `admin.css`)**:
  - Hide the raw Monaco/text JSON box for `specsJson` from the standard admin form view (`admin: { condition: () => false }` or `.field-type.json[data-field-name="specsJson"] { display: none; }`).
  - `ProductSpecFields` remains the visual, user-friendly editor for hardware specifications.
* **A.4. Pricing Tab /design Refactor (`admin.css`, `packages/plugin-shop/`)**:
  - Group `enableVariants` and `enableEurPrice` into a unified top configuration card with clean labels and descriptions.
  - Structure `priceInEUR`, `compareAtPriceInEUR`, and `costInEUR` into a balanced 3-column financial inputs card with `€` prefix adornments and clear helper notes.
  - Integrate smoothly with `ProductMarginPanel` below.

### Batch B — Table Standards, Checkboxes & Header Cleanup
* **B.1. Header Truncation Fix (`admin.css`)**:
  - Remove `max-width: 95px` on `th#heading-subjectType`, `th#heading-type`, `th#heading-operator`, `th#heading-severity`, `th#heading-enabled`.
  - Set `min-width: max-content;` and proportional widths so sort buttons and labels fit without clipping.
* **B.2. Double-Header Suppression (`admin.css`)**:
  - When `.bmr-list-header` is present in a collection list view, suppress the duplicate Payload `.collection-list__header` title and button.
* **B.3. Checkbox Alignment & Header Distance (`admin.css`)**:
  - Center table selection checkboxes (`.cell-_select .custom-checkbox`, `input[type="checkbox"]`) with flex centering.
  - Set standard 16px / 24px token distance between search/filter rail and table header.
* **B.4. Dynamic Title Fallback for Compatibility Rules (`EntityListCell.tsx` / `admin.css`)**:
  - Ensure rules with `title: null` or `<No Title>` render a computed fallback rule summary (`formatRuleTitle(rowData)`).

---

## 3. Verification & Gate Plan
1. **Automated Verification**:
   - `pnpm test` (Monorepo Vitest suite, must match/exceed 523 passed tests).
   - `pnpm -r typecheck` (All 6 packages must pass with 0 errors).
   - `pnpm lint` (0 errors).
2. **Visual Browser Verification**:
   - Inspect `/admin/collections/products/17` at 1440px and 1024px:
     - Verify full-width main form.
     - Verify zero scrollbar track below tabs.
     - Verify clean metadata card grid below.
     - Verify clean Pricing tab layout.
     - Verify raw JSON box is concealed.
   - Inspect `/admin/collections/compatibility-rules`:
     - Verify no column header truncation (`Subject Type`, `Severity`, etc.).
     - Verify no redundant double header.
     - Verify centered checkboxes and clean table distance.


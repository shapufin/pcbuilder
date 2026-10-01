# 10 · Page Builder / Blocks

Payload's `blocks` field as the layout builder (https://payloadcms.com/docs/fields/blocks, guide: https://payloadcms.com/posts/guides/how-to-build-flexible-layouts-with-payload-blocks). `Pages` collection spec in [04-collections/platform.md](04-collections/platform.md).

> **Implementation status (2026-10-01)**: **v2 live (entry 22 / Step D)** + **`contactForm` added (entry 23) = 14 blocks** — one file each in `packages/plugin-pages/src/blocks/<slug>.ts` with `interfaceName` + `admin.group`; `pagesPlugin()` injects them all into payload's **`config.blocks`**, and fields (`Pages.layout`, category `topBlocks`, Section's nested field) declare **`blocks: []` + `blockReferences` + `filterOptions`** instead of copying configs. React side in `apps/web/src/blocks/` (`registry.tsx` = blockType→component map incl. `section`, `renderBlocks()` shared by `PageRenderer` and `Section`, unknown blockTypes skipped with a server warning). Composition map done: homepage renders via `/` (isHomepage page, Phase-1 fallback kept), marketing/legal via root `/[slug]`, category pages render the bounded `topBlocks` zone (Hero+CtaBanner) above the hardcoded listing. Newsletter block posts to `POST /api/newsletter`; contactForm posts to `POST /api/contact` (staff inbox). TemplatesCarousel cards apply the template and route to `/builder/configure`. Hero supports all three variants (`image`/`split`/`video` — video uses `videoUrl` + `embedUrlFor`, review entry 9). The `richText` block's Lexical field can embed 6 curated blocks (`BlocksFeature`; converter bridge `lexical-converters.tsx`).

## v2 block system (entry 22)

**One config per file** → `packages/plugin-pages/src/blocks/<slug>.ts`. `slugs.ts` keeps the three `BlockSlug[]` lists: `pageBlockSlugs` (all 14, registry order — `contactForm` appended last, entry 23), `sectionChildSlugs` (everything except `section` — no recursion), `lexicalEmbedBlockSlugs` (productGrid, featuredCategory, ctaBanner, templatesCarousel, videoEmbed, newsletterSignup — contactForm deliberately **not** embeddable in Lexical). `definitions.ts` is the assembler. Invariants (TDD #116/#147/#153/#154, entry-23 updates): slug lists ↔ `pageBlocks` ↔ React registry keys ↔ converter keys.

**References, not copies** — payload resolves any `config.blocks` block into any blocks field, so the allow-list is `filterOptions` (array result = server-side allow-list, verified in `payload/dist/fields/validations.js`):

| Field | `blockReferences` | `filterOptions` |
| --- | --- | --- |
| `pages.layout` | all 14 | same (future-proofing, review F2) |
| `categories.topBlocks` | `hero`, `ctaBanner` | same (a rogue `faq` API write → 400) |
| `section.blocks` (nested) | `sectionChildSlugs` | same (section-in-section → 400) |
| `richText.richtext` (Lexical) | `BlocksFeature({ blocks: lexicalEmbedBlockSlugs })` | rogue embed node → 400 |

**Groups** (block drawer sections via `admin.group`): **Layout** = `section`; **Commerce** = productGrid, featuredCategory, templatesCarousel; **Content** = the other 10 (incl. contactForm).

**Section container** — tabs:

- *content* (unnamed): nested `blocks` field (`initCollapsed`).
- *layout* (named): `padding` none/sm/md/lg/xl → `0`/`--space-5`/`--space-7`/`--space-8`/`--space-9`; `background` page/alt/raised → transparent/`--color-surface`/`--color-surface-raised`; `width` container/wide/full → 1200/1440/none px (defaults md/page/container). `Section.tsx` resolves values through **closed lookup maps** — editor input never reaches a style property (raw `<script>` values fall back to defaults, #152b).

**Lexical embeds** — the `richText` block's field carries a field-level `lexicalEditor` with `richTextFeatures` (`defaultFeatures` + curated `BlocksFeature`). Render side: `buildLexicalBlockConverters()` builds one converter per embed slug off the React registry; **always pass the function form `lexicalRichTextConverters`** (`({ defaultConverters }) => ({ ...defaultConverters, ... })`) — payload's `RichText` merges its default JSX converters *only* when given a function; a bare object replaces them and paragraphs render as "unknown node" (entry-22 review F1, regression test #155).

**`config.blocks` injection** — `pagesPlugin()` appends the 14 blocks (append + dedupe by slug, #149) *before* payload's sanitize pass. `enabled: false` still injects blocks (the `richText` block's field-level `BlocksFeature` resolves slugs at boot and would hard-fail without them) — the flag gates the behavioral pieces (globals, SEO wrapper, topBlocks patch) only.

## Block set (14)

| Block | Purpose | Fields | Frontend component | Content strategy | Responsive notes |
| --- | --- | --- | --- | --- | --- |
| Hero | page top banner | heading, subheading, image/video rel, CTA buttons[], align, variant (image/split/video) | `Hero` (RSC) | staff/editorial | split→stack; image via `hero` size |
| RichText | editorial content | richtext | `RichTextBlock` (RSC) | staff | prose styles |
| ProductGrid | product listing teaser | category rel (filterable), limit, columns, "view all" link | `ProductGrid` (RSC) | staff picks category | 4→2→1 cols |
| FeaturedCategory | category spotlight | category rel, image, copy, CTA | `FeaturedCategory` (RSC) | merchandising | stack on mobile |
| Banner/CTA | promo strip | heading, copy, CTA, bg tone (token name) | `CtaBanner` (RSC) | marketing | text wraps |
| BuildTemplatesCarousel | showcase prebuilds | tag filter, autoplay bool | `TemplatesCarousel` (RSC wrapper → client child) | staff | scroll-snap on touch |
| ComparisonTable | vs table | rows (label, values[]), columns[] | `ComparisonTable` (RSC, horizontal scroll) | editorial | overflow-x scroll with shadow cue |
| FAQ | accordion | items[] (q, a richtext) | `Faq` (RSC) | support | single column |
| Testimonials | social proof | items[] (quote, name, role, avatar) | `Testimonials` (RSC grid) | marketing | 3→1 cols |
| LogosStrip | partner brands | brand rels[] | `LogosStrip` (RSC) | marketing | marquee → wrap |
| NewsletterSignup | email capture | heading, consent text | `NewsletterSignup` (RSC wrapper → client form → Resend) | marketing | full-width form |
| VideoEmbed | media | provider, url, poster | `VideoEmbed` (RSC, lazy iframe) | marketing | 16:9 fluid |
| ContactForm | contact form (entry 23) | heading, intro | `ContactForm` (RSC wrapper → client form → `POST /api/contact`) | support | full-width form |
| **Section** | nested container | blocks[] (any non-section), layout (padding/background/width) | `Section` (RSC, wraps `renderBlocks`) | structural grouping | full-bleed band, inner `max-width` |

## Registry pattern

```typescript
// apps/web/src/blocks/registry.tsx — single source of truth (entry 22)
import type { ComponentType } from 'react'
export type BlockComponent = ComponentType<{ block: any }>
export const blockRegistry: Record<string, BlockComponent> = {
  hero: Hero, richText: RichTextBlock, productGrid: ProductGrid,
  featuredCategory: FeaturedCategory, ctaBanner: CtaBanner,
  templatesCarousel: TemplatesCarousel, comparisonTable: ComparisonTable,
  faq: Faq, testimonials: Testimonials, logosStrip: LogosStrip,
  newsletterSignup: NewsletterSignup, videoEmbed: VideoEmbed,
  section: Section, contactForm: ContactForm,
}
```

Keys must equal `pageBlockSlugs` **and** map to the named components — `registry.test.ts` (#154) source-scans the file and pins the pairs (a swapped component type-checks, so names are asserted, not just keys).

`renderBlocks(layout, source)` (shared by `PageRenderer` and `Section`) maps the array → components; unknown blockType (removed block) renders `null` + `console.warn` with the caller label (never crashes a page).

## Page composition map

- Homepage: full blocks (`Hero`, `BuildTemplatesCarousel`, `ProductGrid` ×2, `FeaturedCategory`, `LogosStrip`, `Testimonials`, `NewsletterSignup`).
- Marketing/legal: `RichText` + `CtaBanner` (+ `FaqBlock` on /faq); `/contact` also carries `ContactForm` (seed injects it on `slug === 'contact'`; existing dev page patched via admin REST, entry 23).
- Category pages: hardcoded listing template + admin-editable top block zone (`Hero`, `CtaBanner` allowed only) — bounded flexibility.
- Product page: hardcoded (no blocks — fixed commerce contract).

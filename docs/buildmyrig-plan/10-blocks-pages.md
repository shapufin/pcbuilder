# 10 · Page Builder / Blocks

Payload's `blocks` field as the layout builder (https://payloadcms.com/docs/fields/blocks, guide: https://payloadcms.com/posts/guides/how-to-build-flexible-layouts-with-payload-blocks). `Pages` collection spec in [04-collections/platform.md](04-collections/platform.md).

> **Implementation status (2026-09-28, Phase 3)**: all 12 blocks live in `apps/web/src/blocks/` (`definitions.ts` = Payload configs, `registry.tsx` = blockType->component map, `PageRenderer` skips unknown blockTypes with a server warning). Composition map done: homepage renders via `/` (isHomepage page, Phase-1 fallback kept), marketing/legal via root `/[slug]`, category pages render the bounded `topBlocks` zone (Hero+CtaBanner) above the hardcoded listing. Newsletter block posts to `POST /api/newsletter`. TemplatesCarousel cards apply the template and route to `/builder/configure`. Hero supports all three variants (`image`/`split`/`video` - the video variant uses the `videoUrl` field + `embedUrlFor`, added in review entry 9).

## v1 block set (12)

| Block | Purpose | Fields | Frontend component | Content strategy | Responsive notes |
| --- | --- | --- | --- | --- | --- |
| Hero | page top banner | heading, subheading, image/video rel, CTA buttons[], align, variant (image/split/video) | `HeroBlock` (RSC; CTA = client) | staff/editorial | split→stack; image via `hero` size |
| RichText | editorial content | richtext | `RichTextBlock` (RSC) | staff | prose styles |
| ProductGrid | product listing teaser | category rel (filterable), limit, columns, "view all" link | `ProductGridBlock` (RSC) | staff picks category | 4→2→1 cols |
| FeaturedCategory | category spotlight | category rel, image, copy, CTA | `FeaturedCategoryBlock` (RSC) | merchandising | stack on mobile |
| Banner/CTA | promo strip | heading, copy, CTA, bg tone (token name) | `CtaBannerBlock` (RSC) | marketing | text wraps |
| BuildTemplatesCarousel | showcase prebuilds | tag filter, autoplay bool | `TemplatesCarouselBlock` (client) | staff | scroll-snap on touch |
| ComparisonTable | vs table | rows (label, values[]), columns[] | `ComparisonTableBlock` (RSC, horizontal scroll) | editorial | overflow-x scroll with shadow cue |
| FAQ | accordion | items[] (q, a richtext) | `FaqBlock` (client) | support | single column |
| Testimonials | social proof | items[] (quote, name, role, avatar) | `TestimonialsBlock` (RSC grid) | marketing | 3→1 cols |
| LogosStrip | partner brands | brand rels[] | `LogosStripBlock` (RSC) | marketing | marquee → wrap |
| NewsletterSignup | email capture | heading, consent text | `NewsletterSignupBlock` (client → Resend) | marketing | full-width form |
| VideoEmbed | media | provider, url, poster | `VideoEmbedBlock` (client, lazy iframe) | marketing | 16:9 fluid |

## Registry pattern

```typescript
// apps/web/blocks/registry.ts — single source of truth
import type { BlockConfig } from './types'
export const blockRegistry: Record<string, BlockConfig> = {
  hero:      { component: HeroBlock, type: 'server' },
  richText:  { component: RichTextBlock, type: 'server' },
  productGrid: { component: ProductGridBlock, type: 'server' },
  featuredCategory: { component: FeaturedCategoryBlock, type: 'server' },
  ctaBanner: { component: CtaBannerBlock, type: 'server' },
  templatesCarousel: { component: TemplatesCarouselClient, type: 'client' },
  comparisonTable: { component: ComparisonTableBlock, type: 'server' },
  faq: { component: FaqBlockClient, type: 'client' },
  testimonials: { component: TestimonialsBlock, type: 'server' },
  logosStrip: { component: LogosStripBlock, type: 'server' },
  newsletterSignup: { component: NewsletterSignupClient, type: 'client' },
  videoEmbed: { component: VideoEmbedClient, type: 'client' },
}
export function blockToComponent(blockType: string) { return blockRegistry[blockType] }
```

`PageRenderer` maps `page.layout[]` → components; unknown blockType (removed block) renders `null` + console warn (never crashes a page). Server components by default; `type: 'client'` only where interactivity demands (carousel, accordion, forms, video consent).

## Page composition map

- Homepage: full blocks (`Hero`, `BuildTemplatesCarousel`, `ProductGrid` ×2, `FeaturedCategory`, `LogosStrip`, `Testimonials`, `NewsletterSignup`).
- Marketing/legal: `RichText` + `CtaBanner` (+ `FaqBlock` on /faq).
- Category pages: hardcoded listing template + admin-editable top block zone (`Hero`, `CtaBanner` allowed only) — bounded flexibility.
- Product page: hardcoded (no blocks — fixed commerce contract).

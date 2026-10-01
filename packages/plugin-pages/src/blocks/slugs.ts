import type { BlockSlug } from 'payload'

/**
 * Slug lists for the block system v2 (entry 22, Phase 5 Step D).
 *
 * Kept separate from `definitions.ts` so block configs (which import from here)
 * never form a module cycle with the assembler. Literal arrays — typed as
 * `BlockSlug` so `blockReferences`/`filterOptions`/`BlocksFeature` accept them
 * both inside this package and in apps/web (where generated types narrow
 * `BlockSlug` to the union of config.blocks keys). Drift between this list and
 * `pageBlocks` is caught by definitions.test.ts (#116/#147).
 */

/** Every block defined once in config.blocks (pages layout allows all 14). */
export const pageBlockSlugs: BlockSlug[] = [
  'hero',
  'richText',
  'productGrid',
  'featuredCategory',
  'ctaBanner',
  'templatesCarousel',
  'comparisonTable',
  'faq',
  'testimonials',
  'logosStrip',
  'newsletterSignup',
  'videoEmbed',
  'section',
  'contactForm',
]

/** What a Section may nest: everything except another section (no recursion). */
export const sectionChildSlugs: BlockSlug[] = pageBlockSlugs.filter((slug) => slug !== 'section')

/**
 * Blocks embeddable inside Lexical rich text (the RichTextBlock field).
 * Curated: structured/text-heavy blocks stay page-level only.
 */
export const lexicalEmbedBlockSlugs: BlockSlug[] = [
  'productGrid',
  'featuredCategory',
  'ctaBanner',
  'templatesCarousel',
  'videoEmbed',
  'newsletterSignup',
]

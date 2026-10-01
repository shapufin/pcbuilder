import type { Block } from 'payload'
import { ComparisonTableBlock } from './comparison-table.ts'
import { ContactFormBlock } from './contact-form.ts'
import { CtaBannerBlock } from './cta-banner.ts'
import { FaqBlock } from './faq.ts'
import { FeaturedCategoryBlock } from './featured-category.ts'
import { HeroBlock } from './hero.ts'
import { LogosStripBlock } from './logos-strip.ts'
import { NewsletterSignupBlock } from './newsletter-signup.ts'
import { ProductGridBlock } from './product-grid.ts'
import { RichTextBlock } from './rich-text.ts'
import { SectionBlock } from './section.ts'
import { TemplatesCarouselBlock } from './templates-carousel.ts'
import { TestimonialsBlock } from './testimonials.ts'
import { VideoEmbedBlock } from './video-embed.ts'

/**
 * One block config per file (Payload best practice / entry 22 Step D); this
 * module assembles them in registry order. `pagesPlugin()` registers the whole
 * set once in `config.blocks` and fields reference them by slug
 * (`blockReferences`) — Pages `layout`, categories `topBlocks`, the Section
 * container and the Lexical BlocksFeature all share the same definitions.
 * React rendering (registry.tsx / PageRenderer) stays in apps/web.
 * Slug lists live in `slugs.ts` (no import cycle).
 */

export { ComparisonTableBlock } from './comparison-table.ts'
export { ContactFormBlock } from './contact-form.ts'
export { CtaBannerBlock } from './cta-banner.ts'
export { FaqBlock } from './faq.ts'
export { FeaturedCategoryBlock } from './featured-category.ts'
export { HeroBlock } from './hero.ts'
export { LogosStripBlock } from './logos-strip.ts'
export { NewsletterSignupBlock } from './newsletter-signup.ts'
export { ProductGridBlock } from './product-grid.ts'
export { RichTextBlock, richTextFeatures } from './rich-text.ts'
export { SectionBlock } from './section.ts'
export { TemplatesCarouselBlock } from './templates-carousel.ts'
export { TestimonialsBlock } from './testimonials.ts'
export { VideoEmbedBlock } from './video-embed.ts'
export { lexicalEmbedBlockSlugs, pageBlockSlugs, sectionChildSlugs } from './slugs.ts'

export const pageBlocks: Block[] = [
  HeroBlock,
  RichTextBlock,
  ProductGridBlock,
  FeaturedCategoryBlock,
  CtaBannerBlock,
  TemplatesCarouselBlock,
  ComparisonTableBlock,
  FaqBlock,
  TestimonialsBlock,
  LogosStripBlock,
  NewsletterSignupBlock,
  VideoEmbedBlock,
  SectionBlock,
  ContactFormBlock,
]

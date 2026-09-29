import type { ComponentType } from 'react'
import { Hero } from './components/Hero'
import { RichTextBlock } from './components/RichTextBlock'
import { ProductGrid } from './components/ProductGrid'
import { FeaturedCategory } from './components/FeaturedCategory'
import { CtaBanner } from './components/CtaBanner'
import { TemplatesCarousel } from './components/TemplatesCarousel'
import { ComparisonTable } from './components/ComparisonTable'
import { Faq } from './components/Faq'
import { Testimonials } from './components/Testimonials'
import { LogosStrip } from './components/LogosStrip'
import { NewsletterSignup } from './components/NewsletterSignup'
import { VideoEmbed } from './components/VideoEmbed'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent = ComponentType<{ block: any }>

/**
 * blockType → component map (docs/buildmyrig-plan/10-blocks-pages.md).
 * Keys MUST match the block slugs in definitions.ts.
 */
export const blockRegistry: Record<string, BlockComponent> = {
  hero: Hero,
  richText: RichTextBlock,
  productGrid: ProductGrid,
  featuredCategory: FeaturedCategory,
  ctaBanner: CtaBanner,
  templatesCarousel: TemplatesCarousel,
  comparisonTable: ComparisonTable,
  faq: Faq,
  testimonials: Testimonials,
  logosStrip: LogosStrip,
  newsletterSignup: NewsletterSignup,
  videoEmbed: VideoEmbed,
}

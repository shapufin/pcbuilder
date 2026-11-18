import { registerBlockRegistry } from './nested'
import type { ComponentType } from 'react'
import './blocks.css'
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
import { Section } from './components/Section'
import { ContactForm } from './components/ContactForm'
import { Columns } from './components/Columns'
import { TrustBadges } from './components/TrustBadges'
import { BannerCountdown } from './components/BannerCountdown'
import { ReviewsShowcase } from './components/ReviewsShowcase'
import { NexusHero } from '../themes/nexus/blocks/NexusHero'
import { NexusCategoryMatrix } from '../themes/nexus/blocks/NexusCategoryMatrix'
import { NexusProductRail } from '../themes/nexus/blocks/NexusProductRail'
import { NexusSlotExplorer } from '../themes/nexus/blocks/NexusSlotExplorer'
import { AetherHero } from '../themes/aether/blocks/AetherHero'
import { AetherProductLab } from '../themes/aether/blocks/AetherProductLab'
import { AetherLookbook } from '../themes/aether/blocks/AetherLookbook'
import { AetherTelemetryGrid } from '../themes/aether/blocks/AetherTelemetryGrid'
import { AetherCalculator } from '../themes/aether/blocks/AetherCalculator'
import { AetherLoopVisualizer } from '../themes/aether/blocks/AetherLoopVisualizer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent = ComponentType<{ block: any }>

/**
 * blockType → component map (docs/buildmyrig-plan/10-blocks-pages.md).
 * Keys MUST match the block slugs in @buildmyrig/plugin-pages `pageBlocks`
 * (src/blocks/definitions.ts, invariant test #116).
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
  section: Section,
  contactForm: ContactForm,
  // Entry 71 Nexus pack — slugs pinned by definitions.test.ts #147.
  nexusHero: NexusHero,
  nexusCategoryMatrix: NexusCategoryMatrix,
  nexusProductRail: NexusProductRail,
  nexusSlotExplorer: NexusSlotExplorer,
  // Entry 124 Aether pack — hardware laboratory blocks.
  aetherHero: AetherHero,
  aetherProductLab: AetherProductLab,
  aetherLookbook: AetherLookbook,
  aetherTelemetryGrid: AetherTelemetryGrid,
  aetherCalculator: AetherCalculator,
  aetherLoopVisualizer: AetherLoopVisualizer,
  // Entry 74 — horizontal container primitive.
  columns: Columns,
  trustBadges: TrustBadges,
  bannerCountdown: BannerCountdown,
  reviewsShowcase: ReviewsShowcase,
}

// Rich-text embeds resolve components through nested.ts (no import cycle).
registerBlockRegistry(blockRegistry)

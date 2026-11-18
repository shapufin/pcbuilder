/**
 * Derives a readable `blockName` for a page-layout block.
 *
 * Payload renders `blockName` as the block row's title in the editor. Custom
 * row-label components are not viable in 3.90.2 (probe 2026-10-22: the Label
 * receives `path: 'layout'` for every row, `indexPath`/`parentPath` empty, and
 * passing `field` throws "Converting circular structure to JSON"), so the row
 * title is set as data instead — same result, no platform risk.
 */
export const BLOCK_NAME_FIELDS: Record<string, string | null> = {
  aetherCalculator: 'heading',
  aetherHero: 'heading',
  aetherLookbook: 'heading',
  aetherLoopVisualizer: 'heading',
  aetherProductLab: 'heading',
  aetherTelemetryGrid: 'heading',
  bannerCountdown: 'heading',
  columns: null,
  comparisonTable: 'heading',
  contactForm: 'heading',
  ctaBanner: 'heading',
  faq: 'heading',
  featuredCategory: 'heading',
  hero: 'heading',
  logosStrip: 'heading',
  newsletterSignup: 'heading',
  nexusCategoryMatrix: 'heading',
  nexusHero: 'heading',
  nexusProductRail: 'heading',
  nexusSlotExplorer: 'heading',
  productGrid: 'heading',
  reviewsShowcase: 'heading',
  richText: null,
  section: null,
  templatesCarousel: 'heading',
  testimonials: 'heading',
  trustBadges: 'heading',
  videoEmbed: 'title',
}

const MAX = 60

const collapse = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text) return null
  return text.length > MAX ? `${text.slice(0, MAX - 1)}…` : text
}

/**
 * `blockName` for one layout block, or null when the block has no scalar summary
 * field (Payload then keeps showing the block's own label, which is correct).
 */
export const blockNameFor = (block: { blockType?: string } & Record<string, unknown>): string | null => {
  const slug = block.blockType
  if (!slug) return null
  const field = BLOCK_NAME_FIELDS[slug]
  if (field === undefined || field === null) return null
  return collapse(block[field])
}

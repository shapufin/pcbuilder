import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { pageBlockSlugs } from '@buildmyrig/plugin-pages'

/**
 * Step D (entry 22) - the React registry must cover every payload block slug
 * (@buildmyrig/plugin-pages `pageBlocks`): a new config without a component
 * would render as a silent skip + server warning in production.
 *
 * Source-scanned (fs) instead of imported: importing registry.tsx pulls the
 * whole component graph (incl. `@payload-config` -> payload.config.ts) into
 * the unit-test runtime.
 */
describe('block registry coverage', () => {
  it('#154 registry.tsx keys match pageBlockSlugs in order', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'registry.tsx'), 'utf8')
    // key AND component — a swapped value (hero: Faq) type-checks because
    // BlockComponent takes any, so names are pinned explicitly (review F3).
    const pairs = [...src.matchAll(/^\s{2}([A-Za-z0-9]+):\s*([A-Za-z0-9]+),$/gm)].map(
      (m) => `${m[1]}:${m[2]}`,
    )
    expect(pairs).toEqual([
      'hero:Hero',
      'richText:RichTextBlock',
      'productGrid:ProductGrid',
      'featuredCategory:FeaturedCategory',
      'ctaBanner:CtaBanner',
      'templatesCarousel:TemplatesCarousel',
      'comparisonTable:ComparisonTable',
      'faq:Faq',
      'testimonials:Testimonials',
      'logosStrip:LogosStrip',
      'newsletterSignup:NewsletterSignup',
      'videoEmbed:VideoEmbed',
      'section:Section',
      'contactForm:ContactForm',
    ])
    expect(pairs.map((p) => p.split(':')[0])).toEqual([...pageBlockSlugs])
  })
})

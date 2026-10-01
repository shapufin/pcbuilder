import { describe, expect, it } from 'vitest'
import type { Block, Field } from 'payload'
import {
  lexicalEmbedBlockSlugs,
  pageBlocks,
  pageBlockSlugs,
  richTextFeatures,
  sectionChildSlugs,
} from './definitions.ts'

const bySlug = (slug: string): Block | undefined => pageBlocks.find((b) => b.slug === slug)

const fieldNamed = (block: Block | undefined, name: string): Field | undefined =>
  (block?.fields ?? []).find((f): f is Field & { name: string } => 'name' in f && f.name === name)

type TabsField = Field & {
  tabs: Array<{ name?: string; label?: string; fields: Field[] }>
}
type BlocksFieldShape = Field & {
  type: 'blocks'
  blocks: Block[]
  blockReferences?: string[]
  filterOptions?: unknown
}
type SelectFieldShape = Field & {
  type: 'select'
  options: Array<{ label: string; value: string }> | string[]
  defaultValue?: string
}

describe('pageBlocks (moved from apps/web, entry 19)', () => {
  it('#116 the block slugs in registry order (10-blocks-pages.md; + section entry 22, + contactForm entry 23)', () => {
    expect(pageBlocks.map((b) => b.slug)).toEqual([
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
    ])
    expect(pageBlockSlugs).toEqual(pageBlocks.map((b) => b.slug))
  })
})

/**
 * Step D (entry 22) - block system v2: one config per file, interfaceName for
 * generated types, drawer groups, section container, curated Lexical embeds.
 */
describe('block system v2 (entry 22, Phase 5 Step D)', () => {
  it('#144 every block declares a unique PascalCase interfaceName ending in "Block"', () => {
    const names = pageBlocks.map((b) => b.interfaceName)
    for (const name of names) {
      expect(name, `missing interfaceName on a block`).toMatch(/^[A-Z][A-Za-z]+Block$/)
    }
    expect(new Set(names).size).toBe(pageBlocks.length)
  })

  it('#145 every block carries an admin.group (drawer grouping: Layout/Content/Commerce)', () => {
    const allowed = ['Layout', 'Content', 'Commerce']
    for (const block of pageBlocks) {
      expect(allowed, `${block.slug} has no group`).toContain(block.admin?.group)
    }
    expect(bySlug('section')?.admin?.group).toBe('Layout')
    expect(
      ['productGrid', 'featuredCategory', 'templatesCarousel'].map(
        (slug) => bySlug(slug)?.admin?.group,
      ),
    ).toEqual(['Commerce', 'Commerce', 'Commerce'])
    expect(bySlug('hero')?.admin?.group).toBe('Content')
  })

  it('#146 section block: content tab (root-level nested blocks) + layout tab (padding/background/width)', () => {
    const section = bySlug('section')
    expect(section, 'section block missing').toBeDefined()

    const tabsField = (section!.fields ?? []).find((f) => f.type === 'tabs') as TabsField | undefined
    expect(tabsField, 'section needs a tabs field').toBeDefined()
    const [contentTab, layoutTab] = tabsField!.tabs

    // Content tab is unnamed so its blocks land at block.blocks
    expect(contentTab.name).toBeUndefined()
    expect(contentTab.label).toBe('Content')
    const blocksField = contentTab.fields.find(
      (f) => 'name' in f && f.name === 'blocks',
    ) as BlocksFieldShape | undefined
    expect(blocksField?.type).toBe('blocks')
    expect(blocksField?.blocks).toEqual([])
    expect(blocksField?.blockReferences).toEqual(sectionChildSlugs)
    expect(typeof blocksField?.filterOptions).toBe('function')
    // no recursive sections: filterOptions must reject a nested section row
    expect((blocksField!.filterOptions as () => string[])()).not.toContain('section')

    // Layout tab is named -> data lives under block.layout
    expect(layoutTab.name).toBe('layout')
    expect(layoutTab.label).toBe('Layout')
    const layoutFields = layoutTab.fields as SelectFieldShape[]
    expect(layoutFields.map((f) => f.name)).toEqual(['padding', 'background', 'width'])
    expect(layoutFields[0].options.map((o) => (typeof o === 'string' ? o : o.value))).toEqual([
      'none',
      'sm',
      'md',
      'lg',
      'xl',
    ])
    expect(layoutFields[0].defaultValue).toBe('md')
    expect(layoutFields[1].defaultValue).toBe('page')
    expect(layoutFields[2].defaultValue).toBe('container')
  })

  it('#147 derived slug lists stay in sync with pageBlockSlugs', () => {
    expect(sectionChildSlugs).toEqual(pageBlockSlugs.filter((s) => s !== 'section'))
    expect(sectionChildSlugs).toHaveLength(pageBlockSlugs.length - 1)
    expect(lexicalEmbedBlockSlugs).toEqual([
      'productGrid',
      'featuredCategory',
      'ctaBanner',
      'templatesCarousel',
      'videoEmbed',
      'newsletterSignup',
    ])
    for (const slug of lexicalEmbedBlockSlugs) {
      expect(pageBlockSlugs).toContain(slug)
    }
    expect(lexicalEmbedBlockSlugs).not.toContain('section')
    expect(lexicalEmbedBlockSlugs).not.toContain('richText')
  })

  it('#148 RichTextBlock.richtext carries a field-level lexical editor (BlocksFeature embeds)', () => {
    const richtext = fieldNamed(bySlug('richText'), 'richtext') as
      | (Field & { editor?: unknown })
      | undefined
    expect(richtext?.type).toBe('richText')
    // lexicalEditor() returns the adapter provider fn — without it the field
    // would silently fall back to the config-level editor (no embeds).
    expect(typeof richtext?.editor, 'field-level editor missing').toBe('function')
    // ...and the editor must actually register the BlocksFeature with the
    // curated embed list — asserting only `editor` stays green if the
    // features callback drops BlocksFeature entirely.
    const features = richTextFeatures({ defaultFeatures: [] as never[] })
    const blocksFeature = features[features.length - 1] as {
      key?: string
      serverFeatureProps?: { blocks?: unknown }
    }
    expect(blocksFeature.key).toBe('blocks')
    expect(blocksFeature.serverFeatureProps?.blocks).toEqual([...lexicalEmbedBlockSlugs])
  })
})

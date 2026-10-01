import type { Block } from 'payload'
import type { FeatureProviderServer } from '@payloadcms/richtext-lexical'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { lexicalEmbedBlockSlugs } from './slugs.ts'

/**
 * Curated embed list for the RichTextBlock field — exported so the invariant
 * test can assert the BlocksFeature is present with the right slugs (#148)
 * without reaching into payload's editor internals.
 */
export const richTextFeatures = ({ defaultFeatures }: { defaultFeatures: FeatureProviderServer[] }) => [
  ...defaultFeatures,
  BlocksFeature({ blocks: lexicalEmbedBlockSlugs }),
]

/**
 * Field-level editor so staff can embed curated blocks (product grid, CTA,
 * video…) directly in long-form copy — same config.blocks definitions, no
 * second schema (blockReferences pattern, entry 22).
 */
export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  admin: { group: 'Content' },
  fields: [
    {
      name: 'richtext',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: richTextFeatures,
      }),
    },
  ],
}

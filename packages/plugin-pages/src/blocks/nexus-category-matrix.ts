import type { Block } from 'payload'

/**
 * Entry 71 (Nexus) — animated category cards ported from StorefrontView's
 * category grid (SMIL/SVG circuitry lines in the renderer). Each item links
 * to a shop category page.
 */
export const NexusCategoryMatrixBlock: Block = {
  slug: 'nexusCategoryMatrix',
  interfaceName: 'NexusCategoryMatrixBlock',
  labels: {
    singular: 'Nexus Category Matrix',
    plural: 'Nexus Category Matrices',
  },
  admin: { group: 'Nexus' },
  fields: [
    { name: 'eyebrow', type: 'text', maxLength: 120 },
    { name: 'heading', type: 'text', required: true },
    {
      name: 'items',
      type: 'array',
      labels: {
        singular: 'Category Card',
        plural: 'Category Cards',
      },
      admin: { initCollapsed: true },
      required: true,
      fields: [
        { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
        {
          name: 'icon',
          type: 'select',
          required: true,
          options: ['gpu', 'cpu', 'cooling', 'ram', 'storage', 'power', 'case', 'motherboard'],
          defaultValue: 'gpu',
        },
        { name: 'blurb', type: 'text', maxLength: 200 },
      ],
    },
  ],
}

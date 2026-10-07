import type { Block } from 'payload'

/**
 * Entry 71 (Nexus) — animated category cards ported from StorefrontView's
 * category grid (SMIL/SVG circuitry lines in the renderer). Each item links
 * to a shop category page.
 */
export const NexusCategoryMatrixBlock: Block = {
  slug: 'nexusCategoryMatrix',
  interfaceName: 'NexusCategoryMatrixBlock',
  admin: { group: 'Nexus' },
  fields: [
    { name: 'eyebrow', type: 'text', maxLength: 120 },
    { name: 'heading', type: 'text', required: true },
    {
      name: 'items',
      type: 'array',
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

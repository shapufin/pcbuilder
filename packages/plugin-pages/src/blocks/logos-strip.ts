import type { Block } from 'payload'

export const LogosStripBlock: Block = {
  slug: 'logosStrip',
  interfaceName: 'LogosStripBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'brands', type: 'relationship', relationTo: 'brands', hasMany: true },
  ],
}

import type { Block } from 'payload'

export const ProductGridBlock: Block = {
  slug: 'productGrid',
  interfaceName: 'ProductGridBlock',
  admin: { group: 'Commerce' },
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'limit', type: 'number', defaultValue: 4, min: 1, max: 12 },
    { name: 'columns', type: 'select', options: ['2', '3', '4'], defaultValue: '3' },
    { name: 'viewAllLabel', type: 'text', defaultValue: 'View all' },
  ],
}

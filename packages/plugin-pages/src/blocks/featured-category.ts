import type { Block } from 'payload'

export const FeaturedCategoryBlock: Block = {
  slug: 'featuredCategory',
  interfaceName: 'FeaturedCategoryBlock',
  admin: { group: 'Commerce' },
  fields: [
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'image', type: 'relationship', relationTo: 'media' },
    { name: 'heading', type: 'text', required: true },
    { name: 'copy', type: 'textarea' },
    { name: 'ctaLabel', type: 'text', defaultValue: 'Shop now' },
  ],
}

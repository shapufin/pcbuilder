import type { Block } from 'payload'

export const ReviewsShowcaseBlock: Block = {
  slug: 'reviewsShowcase',
  interfaceName: 'ReviewsShowcaseBlock',
  labels: {
    singular: 'Customer Reviews Showcase',
    plural: 'Customer Reviews Showcases',
  },
  admin: { group: 'Commerce' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow', defaultValue: 'TESTED BY BUILDERS' },
    { name: 'heading', type: 'text', label: 'Heading', defaultValue: 'What Our Customers Say', required: true },
    {
      name: 'limit',
      type: 'number',
      label: 'Max Reviews to Display',
      defaultValue: 6,
      min: 1,
      max: 12,
    },
    {
      name: 'featuredReviews',
      type: 'relationship',
      relationTo: 'reviews' as never,
      hasMany: true,
      label: 'Handpicked Featured Reviews (Optional)',
      admin: {
        description: 'Leave empty to automatically pull the highest-rated verified reviews.',
      },
    },
  ],
}

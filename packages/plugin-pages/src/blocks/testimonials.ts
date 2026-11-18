import type { Block } from 'payload'

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: {
    singular: 'Testimonials Section',
    plural: 'Testimonials Sections',
  },
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'What builders say' },
    {
      name: 'items',
      type: 'array',
      labels: {
        singular: 'Testimonial',
        plural: 'Testimonials',
      },
      admin: {
        initCollapsed: true,
      },
      fields: [
        { name: 'quote', type: 'textarea', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'text' },
        { name: 'avatar', type: 'relationship', relationTo: 'media' },
      ],
    },
  ],
}

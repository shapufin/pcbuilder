import type { Block } from 'payload'

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'subheading', type: 'text' },
    { name: 'image', type: 'relationship', relationTo: 'media' },
    {
      name: 'videoUrl',
      type: 'text',
      admin: { description: 'YouTube or Vimeo URL — used when variant = video' },
    },
    { name: 'variant', type: 'select', options: ['image', 'split', 'video'], defaultValue: 'image' },
    { name: 'align', type: 'select', options: ['left', 'center'], defaultValue: 'center' },
    {
      name: 'ctas',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'style', type: 'select', options: ['primary', 'secondary'], defaultValue: 'primary' },
      ],
    },
  ],
}

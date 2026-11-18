import type { Block } from 'payload'
import { isSafeNavLinkUrl } from '../lib/site-settings.ts'

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: {
    singular: 'Hero Banner',
    plural: 'Hero Banners',
  },
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
      labels: {
        singular: 'Call to Action',
        plural: 'Calls to Action',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: unknown) => {
            if (typeof value !== 'string' || !value.trim()) return 'URL is required'
            return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
          },
        },
        { name: 'style', type: 'select', options: ['primary', 'secondary'], defaultValue: 'primary' },
      ],
    },
  ],
}

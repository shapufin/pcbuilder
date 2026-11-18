import type { Block } from 'payload'
import { isSafeNavLinkUrl } from '../lib/site-settings.ts'

export const CtaBannerBlock: Block = {
  slug: 'ctaBanner',
  interfaceName: 'CtaBannerBlock',
  labels: {
    singular: 'CTA Banner',
    plural: 'CTA Banners',
  },
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'copy', type: 'textarea' },
    { name: 'ctaLabel', type: 'text' },
    {
      name: 'ctaUrl',
      type: 'text',
      validate: (value: unknown) => {
        if (value === undefined || value === null || value === '') return true
        if (typeof value !== 'string') return 'Invalid URL'
        return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
      },
    },
    { name: 'tone', type: 'select', options: ['dark', 'indigo', 'slate'], defaultValue: 'indigo' },
  ],
}

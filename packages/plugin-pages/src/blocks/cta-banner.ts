import type { Block } from 'payload'

export const CtaBannerBlock: Block = {
  slug: 'ctaBanner',
  interfaceName: 'CtaBannerBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'copy', type: 'textarea' },
    { name: 'ctaLabel', type: 'text' },
    { name: 'ctaUrl', type: 'text' },
    { name: 'tone', type: 'select', options: ['dark', 'indigo', 'slate'], defaultValue: 'indigo' },
  ],
}

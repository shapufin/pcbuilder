import type { Block } from 'payload'

export const TemplatesCarouselBlock: Block = {
  slug: 'templatesCarousel',
  interfaceName: 'TemplatesCarouselBlock',
  admin: { group: 'Commerce' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Ready-to-go builds' },
    { name: 'tagFilter', type: 'text' },
    { name: 'autoplay', type: 'checkbox', defaultValue: false },
  ],
}

import type { Block } from 'payload'

export const VideoEmbedBlock: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'provider', type: 'select', options: ['youtube', 'vimeo'], defaultValue: 'youtube' },
    { name: 'url', type: 'text', required: true },
    { name: 'poster', type: 'relationship', relationTo: 'media' },
    { name: 'title', type: 'text', defaultValue: 'Video' },
  ],
}

import type { Block } from 'payload'

export const VideoEmbedBlock: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  labels: {
    singular: 'Video Embed',
    plural: 'Video Embeds',
  },
  admin: { group: 'Content' },
  fields: [
    { name: 'provider', type: 'select', options: ['youtube', 'vimeo'], defaultValue: 'youtube' },
    {
      name: 'url',
      type: 'text',
      required: true,
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !value.trim()) return 'Video URL is required'
        const trimmed = value.trim()
        if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return true
        return 'Video URL must begin with https://'
      },
    },
    { name: 'poster', type: 'relationship', relationTo: 'media' },
    { name: 'title', type: 'text', defaultValue: 'Video' },
  ],
}

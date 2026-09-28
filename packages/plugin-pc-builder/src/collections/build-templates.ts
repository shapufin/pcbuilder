import type { CollectionConfig } from 'payload'

export const BuildTemplates: CollectionConfig = {
  slug: 'build-templates',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  versions: { drafts: true },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'tags', 'basePrice', '_status'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { position: 'sidebar' } },
    { name: 'description', type: 'textarea' },
    { name: 'heroCopy', type: 'richText' },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true },
    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      options: ['gaming', 'editing', 'workstation', 'streaming'],
    },
    {
      name: 'slots',
      type: 'array',
      fields: [
        { name: 'category', type: 'relationship', relationTo: 'component-categories', required: true },
        { name: 'component', type: 'relationship', relationTo: 'components' },
      ],
    },
    { name: 'basePrice', type: 'number', admin: { readOnly: true, description: 'Computed from slots server-side' } },
    { name: 'popularity', type: 'number', defaultValue: 0, admin: { readOnly: true } },
  ],
}

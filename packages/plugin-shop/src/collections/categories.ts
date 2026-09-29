import type { CollectionConfig } from 'payload'
import { isManager } from '../lib/access.ts'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    read: () => true,
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'parent'] },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { position: 'sidebar' } },
    { name: 'parent', type: 'relationship', relationTo: 'categories', index: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'description', type: 'textarea' },
  ],
}


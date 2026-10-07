import type { CollectionConfig } from 'payload'
import { isManager } from '../lib/access.ts'

export const Brands: CollectionConfig = {
  slug: 'brands',
  access: {
    read: () => true,
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
    listSearchableFields: ['name', 'slug'],
    group: 'Store',
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
        { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { width: '40%', position: 'sidebar' } },
      ],
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'url', type: 'text' },
  ],
}


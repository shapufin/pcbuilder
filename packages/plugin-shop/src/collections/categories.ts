import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    // drafts:true without a read gate leaks unpublished docs via ?draft=true —
    // anonymous/customers see published only (Pages.ts pattern).
    read: ({ req }) => {
      if (isStaff(req.user as { roles?: string[] | null } | null)) return true
      return { _status: { equals: 'published' } }
    },
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


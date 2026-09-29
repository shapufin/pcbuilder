import type { CollectionConfig } from 'payload'
import { isManager } from '../lib/access.ts'

export const AttributeTypes: CollectionConfig = {
  slug: 'attribute-types',
  access: {
    read: () => true,
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'valueType'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { description: 'URL filter param name, e.g. "socket" → ?socket=AM5' } },
    { name: 'valueType', type: 'select', required: true, defaultValue: 'enum', options: ['enum', 'number'] },
    { name: 'unit', type: 'text', admin: { description: 'Display unit, e.g. MHz, GB, W' } },
  ],
}


import type { CollectionConfig } from 'payload'
import { isManager } from '../lib/access.ts'

export const AttributeValues: CollectionConfig = {
  slug: 'attribute-values',
  access: {
    read: () => true,
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: { useAsTitle: 'value', defaultColumns: ['attributeType', 'value'] },
  fields: [
    { name: 'attributeType', type: 'relationship', relationTo: 'attribute-types', required: true, index: true },
    { name: 'value', type: 'text', required: true },
    { name: 'displayLabel', type: 'text' },
  ],
}


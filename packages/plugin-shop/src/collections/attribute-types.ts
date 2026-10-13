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
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'valueType', 'unit'],
    listSearchableFields: ['name', 'slug'],
    group: 'Store',
  },
  hooks: {
    afterDelete: [
      async ({ id, req }) => {
        try {
          await req.payload.delete({
            collection: 'attribute-values',
            where: { attributeType: { equals: id } },
            overrideAccess: true,
          })
        } catch (err) {
          req.payload.logger.error(
            `attribute-types: cascade delete of attribute-values failed for type ${String(id)}: ${String(err)}`,
          )
        }
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { width: '50%', description: 'URL filter param name, e.g. "socket" → ?socket=AM5' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'valueType', type: 'select', required: true, defaultValue: 'enum', options: ['enum', 'number'], admin: { width: '50%' } },
        { name: 'unit', type: 'text', admin: { width: '50%', description: 'Display unit, e.g. MHz, GB, W' } },
      ],
    },
  ],
}


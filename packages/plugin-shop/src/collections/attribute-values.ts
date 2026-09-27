import type { CollectionConfig } from 'payload'

export const AttributeValues: CollectionConfig = {
  slug: 'attribute-values',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: { useAsTitle: 'value', defaultColumns: ['attributeType', 'value'] },
  fields: [
    { name: 'attributeType', type: 'relationship', relationTo: 'attribute-types', required: true, index: true },
    { name: 'value', type: 'text', required: true },
    { name: 'displayLabel', type: 'text' },
  ],
}


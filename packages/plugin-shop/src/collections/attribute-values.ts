import { APIError, type CollectionConfig } from 'payload'
import { isManager } from '../lib/access.ts'

export const AttributeValues: CollectionConfig = {
  slug: 'attribute-values',
  access: {
    read: () => true,
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: {
    useAsTitle: 'value',
    defaultColumns: ['value', 'displayLabel', 'attributeType'],
    listSearchableFields: ['value', 'displayLabel'],
    group: 'Store',
    hidden: true,
    description: 'Attribute terms/values. Managed within parent Attribute Types in the unified attributes manager.',
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data || !data.value) return data
        const rawType = data.attributeType ?? originalDoc?.attributeType
        const typeId =
          rawType && typeof rawType === 'object' && 'id' in rawType ? (rawType as { id: unknown }).id : rawType
        const val = typeof data.value === 'string' ? data.value.trim() : ''
        if (!typeId || !val) return data

        const existing = await req.payload.find({
          collection: 'attribute-values',
          where: {
            and: [
              { attributeType: { equals: typeId } },
              { value: { equals: val } },
              ...(operation === 'update' && originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })

        if (existing.docs.length > 0) {
          throw new APIError(`A term with value "${val}" already exists for this attribute type.`, 400)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'attributeType', type: 'relationship', relationTo: 'attribute-types', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'value', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'displayLabel', type: 'text', admin: { width: '50%' } },
      ],
    },
  ],
}


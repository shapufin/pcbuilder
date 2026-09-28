import type { CollectionConfig } from 'payload'

const buildOwnerAccess = ({ req }: { req: { user?: { id?: unknown } | null } }) => {
  if (!req.user) return false
  return { user: { equals: req.user.id } }
}

export const ConfiguredBuilds: CollectionConfig = {
  slug: 'configured-builds',
  access: {
    read: buildOwnerAccess,
    create: ({ req }) => Boolean(req.user),
    update: buildOwnerAccess,
    delete: buildOwnerAccess,
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'user', 'status', 'priceSnapshot'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { name: 'shareId', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'slots',
      type: 'array',
      required: true,
      fields: [
        { name: 'category', type: 'relationship', relationTo: 'component-categories', required: true },
        { name: 'components', type: 'relationship', relationTo: 'components', hasMany: true },
      ],
    },
    { name: 'priceSnapshot', type: 'number', admin: { readOnly: true, description: 'Display-only; recomputed server-side at checkout' } },
    {
      name: 'validationSnapshot',
      type: 'json',
      admin: { readOnly: true, description: '{ errors, warnings, rulesVersion } from the rule engine at save time' },
    },
    { name: 'status', type: 'select', options: ['draft', 'addedToCart', 'ordered'], defaultValue: 'draft' },
  ],
}

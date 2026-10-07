import type { CollectionConfig } from 'payload'
import { isManager } from '../lib/access.ts'
import { invalidateBuilderIndex } from '../lib/builder-index.ts'

export const ComponentCategories: CollectionConfig = {
  slug: 'component-categories',
  access: {
    read: () => true,
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  hooks: {
    afterChange: [() => invalidateBuilderIndex()],
    afterDelete: [() => invalidateBuilderIndex()],
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'sortOrder', 'required', 'maxSelectable', 'updatedAt'],
    listSearchableFields: ['name', 'slug'],
    group: 'PC Builder',
  },
  defaultSort: 'sortOrder',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
        { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { width: '40%', position: 'sidebar' } },
      ],
    },
    { name: 'icon', type: 'text', admin: { description: 'Token name from packages/ui icon set' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, index: true },
    { name: 'required', type: 'checkbox', defaultValue: true },
    { name: 'maxSelectable', type: 'number', min: 1, defaultValue: 1, validate: (v: unknown) => v == null || Number.isInteger(v) || 'Must be a whole slot count', admin: { description: 'e.g. storage = 2, case-fan = 6' } },
    { name: 'helperText', type: 'text' },
  ],
}

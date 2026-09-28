import type { CollectionConfig } from 'payload'

export const ComponentCategories: CollectionConfig = {
  slug: 'component-categories',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: { useAsTitle: 'name' },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { position: 'sidebar' } },
    { name: 'icon', type: 'text', admin: { description: 'Token name from packages/ui icon set' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, index: true },
    { name: 'required', type: 'checkbox', defaultValue: true },
    { name: 'maxSelectable', type: 'number', defaultValue: 1, admin: { description: 'e.g. storage = 2, case-fan = 6' } },
    { name: 'helperText', type: 'text' },
  ],
}

import type { CollectionConfig } from 'payload'

export const DerivedPowerRules: CollectionConfig = {
  slug: 'derived-power-rules',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: { useAsTitle: 'id', defaultColumns: ['targetCategory', 'overheadMultiplier', 'baseWatts', 'severity'] },
  fields: [
    { name: 'targetCategory', type: 'relationship', relationTo: 'component-categories', required: true },
    {
      name: 'overheadMultiplier',
      type: 'number',
      defaultValue: 1.3,
      admin: { description: 'requiredWatts = sum(tdpWatts) * multiplier + baseWatts' },
    },
    { name: 'baseWatts', type: 'number', defaultValue: 100 },
    { name: 'severity', type: 'select', options: ['error', 'warning'], defaultValue: 'warning' },
  ],
}

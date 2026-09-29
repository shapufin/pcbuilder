import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'
import { invalidateBuilderIndex } from '../lib/builder-index.ts'

export const DerivedPowerRules: CollectionConfig = {
  slug: 'derived-power-rules',
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  hooks: {
    afterChange: [() => invalidateBuilderIndex()],
    afterDelete: [() => invalidateBuilderIndex()],
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

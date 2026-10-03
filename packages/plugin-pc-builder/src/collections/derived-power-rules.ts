import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'
import { invalidateBuilderIndex } from '../lib/builder-index.ts'

/**
 * Single global config (audit minor C8): the builder index reads `docs[0]`
 * only, so a second doc used to be a silent no-op. Reject it loudly instead.
 */
const singletonGuard: CollectionBeforeValidateHook = async ({ req, operation }) => {
  if (operation && operation !== 'create') return
  const existing = await req.payload.find({ collection: 'derived-power-rules', limit: 1, depth: 0 })
  if (existing.totalDocs > 0) {
    throw new APIError(
      'Derived power rules are a single global config — edit the existing doc instead of adding another.',
      400,
    )
  }
}

export const DerivedPowerRules: CollectionConfig = {
  slug: 'derived-power-rules',
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  hooks: {
    beforeValidate: [singletonGuard],
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

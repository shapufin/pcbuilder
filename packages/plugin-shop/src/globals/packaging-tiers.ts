import type { GlobalConfig } from 'payload'
import { isManager } from '../lib/access.ts'

/**
 * Entry 71 (Nexus) — checkout packaging tiers (ported from the source app's
 * `PACKAGING_TIERS` constant). Read is public (the checkout picker needs it);
 * writes are manager+. Price is `priceCents` — integer cents like every other
 * money field; the cart line re-resolves it server-side on every write.
 */
export const PackagingTiers: GlobalConfig = {
  slug: 'packaging-tiers',
  label: 'Packaging tiers',
  admin: {
    description: 'Delivery/packaging upgrades offered at checkout (Nexus storefront).',
    group: 'Store',
  },
  access: {
    read: () => true,
    update: ({ req }) => isManager(req.user as never),
  },
  fields: [
    {
      name: 'tiers',
      type: 'array',
      label: 'Tiers',
      fields: [
        {
          name: 'id',
          type: 'text',
          required: true,
          unique: true,
          maxLength: 40,
          admin: { description: 'Stable id (lowercase, dashes) — cart lines reference it, e.g. pelican' },
          validate: (value: unknown) =>
            typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value)
              ? true
              : 'Lowercase letters, numbers and dashes only (e.g. white-glove)',
        },
        { name: 'name', type: 'text', required: true, maxLength: 80 },
        { name: 'badge', type: 'text', maxLength: 40, admin: { width: 30 } },
        { name: 'description', type: 'textarea', maxLength: 400 },
        {
          name: 'features',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true, maxLength: 120 }],
        },
        {
          name: 'priceCents',
          type: 'number',
          required: true,
          min: 0,
          admin: { description: 'Upgrade price in EUR cents (0 = free default tier)' },
        },
        { name: 'enabled', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}

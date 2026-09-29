import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'

/**
 * Prices support single-currency v1 (EUR) with a multi-currency-ready schema.
 * Amounts are stored in minor units (cents).
 */
export const Prices: CollectionConfig = {
  slug: 'prices',
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: { useAsTitle: 'amount', defaultColumns: ['amount', 'currency', 'variant', 'product'] },
  fields: [
    { name: 'amount', type: 'number', required: true, min: 0, admin: { description: 'Minor units (cents)' } },
    { name: 'currency', type: 'text', defaultValue: 'EUR', required: true },
    { name: 'variant', type: 'relationship', relationTo: 'variants', index: true },
    { name: 'product', type: 'relationship', relationTo: 'products', index: true },
    { name: 'validFrom', type: 'date', admin: { position: 'sidebar' } },
    { name: 'validUntil', type: 'date', admin: { position: 'sidebar' } },
  ],
}


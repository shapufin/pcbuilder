import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'

/**
 * Static tax-rate table (A19). Prices are VAT-inclusive, so `rate` extracts
 * the tax portion inside the charge rather than adding on top. `isDefault`
 * rows apply until checkout collects a shipping country; then `country`
 * (ISO-ish code, e.g. 'DE') matches.
 */
export const TaxRates: CollectionConfig = {
  slug: 'tax-rates',
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: { useAsTitle: 'country', defaultColumns: ['country', 'rate', 'isDefault', 'enabled'] },
  fields: [
    { name: 'country', type: 'text', admin: { description: "Country code, or 'default'" } },
    { name: 'rate', type: 'number', required: true, admin: { description: 'VAT percent, e.g. 20' } },
    { name: 'isDefault', type: 'checkbox', defaultValue: false, admin: { description: 'Used when the shipping country is unknown' } },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
  ],
}

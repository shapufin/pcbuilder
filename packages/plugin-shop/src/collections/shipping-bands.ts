import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'

/**
 * Flat shipping bands (A18): first enabled band whose
 * [minSubtotal, maxSubtotal) range contains the post-discount subtotal wins.
 * Applied server-side in the cart beforeChange hook — never trusted from the
 * client. Staff read-only so ops can inspect what customers were charged.
 */
export const ShippingBands: CollectionConfig = {
  slug: 'shipping-bands',
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'minSubtotal', 'maxSubtotal', 'price', 'enabled'],
    listSearchableFields: ['label'],
    group: 'Store',
  },
  fields: [
    { name: 'label', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'minSubtotal', type: 'number', required: true, defaultValue: 0, min: 0, admin: { width: '50%', description: 'Cents; applies when post-discount subtotal >= this' } },
        { name: 'maxSubtotal', type: 'number', min: 0, admin: { width: '50%', description: 'Cents; exclusive upper bound. Empty = no cap.' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'price', type: 'number', required: true, defaultValue: 0, min: 0, admin: { width: '50%', description: 'Cents' } },
        { name: 'enabled', type: 'checkbox', defaultValue: true, admin: { width: '50%' } },
      ],
    },
  ],
}

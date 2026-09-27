import type { CollectionConfig } from 'payload'

/**
 * Simple discount codes for v1: percentage, fixed amount, or free shipping.
 * One code per order; validated server-side only.
 */
export const DiscountCodes: CollectionConfig = {
  slug: 'discount-codes',
  access: {
    // Codes are never publicly listable; validation happens via a dedicated endpoint.
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: { useAsTitle: 'code', defaultColumns: ['code', 'type', 'value', 'usedCount', 'enabled'] },
  fields: [
    { name: 'code', type: 'text', unique: true, index: true, required: true },
    { name: 'type', type: 'select', required: true, options: ['percentage', 'fixed', 'freeShipping'], defaultValue: 'percentage' },
    { name: 'value', type: 'number', admin: { description: 'Percent (0-100) for percentage; cents for fixed' } },
    { name: 'maxUses', type: 'number' },
    { name: 'usedCount', type: 'number', defaultValue: 0, access: { update: ({ req }) => Boolean(req.user) } },
    { name: 'minSubtotal', type: 'number', admin: { description: 'Cents; applies when cart subtotal >= this' } },
    { name: 'validFrom', type: 'date', admin: { position: 'sidebar' } },
    { name: 'validUntil', type: 'date', admin: { position: 'sidebar' } },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
  ],
}


import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'

/**
 * Inventory reservations (audit gap P2-C6): one hold per payment initiation.
 * Created by the wrapped `initiatePayment` (lib/reservations.ts), released on
 * payment failure/cancel/expiry, converted at settlement. Rows are
 * server-managed — REST writes are manager+-only and nothing in the app
 * writes them through the API.
 */
export const InventoryReservations: CollectionConfig = {
  slug: 'inventory-reservations',
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: {
    useAsTitle: 'paymentIntentID',
    defaultColumns: ['paymentIntentID', 'cart', 'status', 'expiresAt'],
    group: 'Store',
  },
  fields: [
    { name: 'paymentIntentID', type: 'text', required: true, index: true, admin: { description: 'Stripe PaymentIntent the hold is keyed to' } },
    { name: 'cart', type: 'relationship', relationTo: 'carts' as never, required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'held',
      options: ['held', 'converted', 'released', 'superseded'],
      index: true,
      admin: { description: 'held → converted (settled) | released (failed/cancelled/expired) | superseded (replaced by a newer hold). Release never restocks.' },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products' as never },
        { name: 'variant', type: 'relationship', relationTo: 'variants' as never },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        { name: 'lineType', type: 'text', admin: { description: "Line type the unit came from ('standard' units are skipped by poll-wins conversion)" } },
      ],
    },
    { name: 'expiresAt', type: 'date', required: true, index: true, admin: { description: 'Hold window (30 min); expired holds are swept to released' } },
  ],
}

import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: {
    singular: 'Review',
    plural: 'Reviews',
  },
  access: {
    read: ({ req }) => {
      if (isStaff(req.user as { roles?: string[] | null } | null)) return true
      return { status: { equals: 'approved' } }
    },
    create: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['rating', 'title', 'product', 'authorName', 'status', 'verifiedPurchase', 'createdAt'],
    listSearchableFields: ['title', 'comment', 'authorName', 'authorEmail'],
    group: 'Store',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'rating',
          type: 'number',
          required: true,
          min: 1,
          max: 5,
          index: true,
          admin: { width: '25%', description: 'Score (1–5 stars)' },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: [
            { label: '🟢 Approved', value: 'approved' },
            { label: '🟡 Pending Moderation', value: 'pending' },
            { label: '🔴 Rejected', value: 'rejected' },
          ],
          index: true,
          admin: { width: '25%' },
          access: {
            create: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
            update: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'authorName', type: 'text', required: true, admin: { width: '50%' } },
        {
          name: 'authorEmail',
          type: 'email',
          required: true,
          admin: { width: '50%', description: 'Private to staff' },
          access: {
            read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
          },
        },
      ],
    },
    { name: 'title', type: 'text', required: true },
    { name: 'comment', type: 'textarea', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'verifiedPurchase',
          type: 'checkbox',
          defaultValue: false,
          admin: { width: '50%', description: 'Verified customer purchase' },
          access: {
            create: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
            update: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
          },
        },
        { name: 'helpfulCount', type: 'number', defaultValue: 0, min: 0, admin: { width: '50%' } },
      ],
    },
  ],
}

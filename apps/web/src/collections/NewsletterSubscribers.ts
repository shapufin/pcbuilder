import type { Access, CollectionConfig } from 'payload'

type RoleUser = { roles?: string[] | null } | null | undefined

const hasRole = (user: RoleUser, roles: string[]): boolean =>
  Boolean(user && Array.isArray(user.roles) && user.roles.some((r) => roles.includes(r)))

const staff: Access = ({ req }) => hasRole(req.user as RoleUser, ['admin', 'manager', 'staff'])
const manager: Access = ({ req }) => hasRole(req.user as RoleUser, ['admin', 'manager'])
const nobody: Access = () => false

/**
 * Newsletter subscribers (audit 2026-11-18 M3). Rows are written only by
 * /api/newsletter + /api/newsletter/confirm (overrideAccess); staff read the
 * list, managers may remove addresses (unsubscribe/GDPR requests).
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  labels: { singular: 'Subscriber', plural: 'Newsletter Subscribers' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'confirmedAt', 'createdAt'],
    listSearchableFields: ['email'],
    group: 'Marketing',
    description: 'Double opt-in list. Addresses appear as pending until the owner clicks the confirmation link.',
  },
  access: { read: staff, create: nobody, update: manager, delete: manager },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending confirmation', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'confirmedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'lastSentAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    {
      // Single-use capability — never readable through the API, not even by staff.
      name: 'confirmToken',
      type: 'text',
      index: true,
      access: { read: () => false, update: () => false },
      admin: { hidden: true },
    },
  ],
}

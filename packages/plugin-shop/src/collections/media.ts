import type { CollectionConfig } from 'payload'

// 11-access-security.md matrix: media is write = staff/manager/admin only,
// and checklist #8 requires an explicit jpeg/png/webp/avif whitelist
// (`image/*` would accept SVG — a stored-XSS vector when opened directly).
const staffRoles = ['admin', 'manager', 'staff']
const isStaff = (user: { roles?: string[] | null } | null | undefined): boolean =>
  Boolean(user && Array.isArray(user.roles) && user.roles.some((r) => staffRoles.includes(r)))

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumb', width: 240, height: 240, position: 'centre' },
      { name: 'card', width: 600, height: 400, position: 'centre' },
      { name: 'gallery', width: 1200, height: undefined, position: 'centre' },
      { name: 'hero', width: 1920, height: undefined, position: 'centre' },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
  ],
}


import type { CollectionConfig } from 'payload'

type UserLike = { id?: unknown; roles?: string[] } | null | undefined

const isAdmin = (user: UserLike): boolean =>
  Boolean(user && Array.isArray(user.roles) && user.roles.includes('admin'))

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // 11-access-security.md matrix: admin writes users, everyone else may only
    // read their own profile. Previously create/update/delete were
    // `Boolean(req.user)` with an unscoped id — any authenticated user could
    // PATCH any other account's roles/password (privilege escalation).
    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req.user as UserLike)) return true
      return { id: { equals: req.user.id } }
    },
    create: ({ req }) => isAdmin(req.user as UserLike),
    update: ({ req, id }) => {
      if (!req.user) return false
      if (isAdmin(req.user as UserLike)) return true
      return String(req.user.id) === String(id)
    },
    delete: ({ req }) => isAdmin(req.user as UserLike),
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['staff'],
      options: ['admin', 'manager', 'staff'],
      access: {
        read: () => true,
        // Only admins assign roles — self-update must not allow escalation.
        create: ({ req }) => isAdmin(req.user as UserLike),
        update: ({ req }) => isAdmin(req.user as UserLike),
      },
    },
  ],
}

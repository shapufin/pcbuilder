import { APIError, type CollectionConfig } from 'payload'
import { canAccessAdminPanel } from '../lib/system-access.ts'

type UserLike = { id?: unknown; roles?: string[] } | null | undefined

const isAdmin = (user: UserLike): boolean =>
  Boolean(user && Array.isArray(user.roles) && user.roles.includes('admin'))

export const protectLastAdminDemotion = async ({
  data,
  originalDoc,
  req,
  operation,
}: {
  data?: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  req: { payload: { find: (args: any) => Promise<{ totalDocs: number }> } }
  operation?: string
}) => {
  if (operation !== 'update' || !data || !originalDoc) return data

  const wasAdmin =
    Array.isArray(originalDoc.roles) && originalDoc.roles.includes('admin')
  const willBeAdmin =
    data.roles === undefined
      ? wasAdmin
      : Array.isArray(data.roles) && data.roles.includes('admin')

  if (wasAdmin && !willBeAdmin) {
    const remainingAdmins = await req.payload.find({
      collection: 'users',
      where: {
        and: [
          { roles: { contains: 'admin' } },
          { id: { not_equals: originalDoc.id } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (remainingAdmins.totalDocs === 0) {
      throw new APIError('Cannot demote the last remaining admin user.', 400)
    }
  }

  return data
}

export const protectLastAdminDeletion = async ({
  id,
  req,
}: {
  id: string | number
  req: any
}) => {
  if (typeof req.payload?.findByID !== 'function') return

  const user = await req.payload.findByID({
    collection: 'users',
    id,
    overrideAccess: true,
  })

  if (user && Array.isArray(user.roles) && user.roles.includes('admin')) {
    const remainingAdmins = await req.payload.find({
      collection: 'users',
      where: {
        and: [
          { roles: { contains: 'admin' } },
          { id: { not_equals: id } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (remainingAdmins.totalDocs === 0) {
      throw new APIError('Cannot delete the last remaining admin user.', 400)
    }
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles', 'createdAt'],
    listSearchableFields: ['email'],
    group: 'System',
    components: {
      beforeList: [
        './app/(payload)/admin/components/UsersListHeader#UsersListHeader',
      ],
    },
  },
  // Entry 15: lockout after 5 failed logins (11-access-security.md); payload
  // adds loginAttempts/lockUntil columns — dev push self-heals, prod must
  // migrate before deploying.
  auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 },
  access: {
    // Audit 2026-11-18 H1: customers share this auth collection — without this
    // gate any storefront account could sign in to /admin.
    admin: canAccessAdminPanel,
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
  hooks: {
    beforeChange: [protectLastAdminDemotion],
    beforeDelete: [
      protectLastAdminDeletion,
      async ({ req, id }) => {
        try {
          await req.payload.update({
            collection: 'configured-builds',
            where: {
              user: { equals: id },
            },
            data: {
              user: null,
            },
          })
        } catch (err) {
          req.payload.logger.error(
            `users: failed to nullify configured-builds user for deleted user ${String(id)}: ${String(err)}`,
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      // Entry 15: least-privilege default for anyone who signs up via
      // /auth/register or the admin UI (seeded staff/admin set roles explicitly).
      defaultValue: ['customer'],
      options: ['admin', 'manager', 'staff', 'customer'],
      access: {
        read: () => true,
        // Only admins assign roles — self-update must not allow escalation.
        create: ({ req }) => isAdmin(req.user as UserLike),
        update: ({ req }) => isAdmin(req.user as UserLike),
      },
    },
  ],
}

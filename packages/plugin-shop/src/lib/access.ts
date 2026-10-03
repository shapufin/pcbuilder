import type { AccessArgs, Where } from 'payload'

type RoleUser = { collection?: string; roles?: string[] | null } | null | undefined

const isUsersDoc = (user: RoleUser): boolean => Boolean(user && (user.collection === undefined || user.collection === 'users'))

/** Matrix roles (11-access-security.md): staff can read operational shop content. */
export const isStaff = (user: RoleUser): boolean =>
  Boolean(isUsersDoc(user) && Array.isArray(user?.roles) && user!.roles!.some((r) => ['admin', 'manager', 'staff'].includes(r)))

/** Manager+ write per the access matrix; staff is read-only on catalog content. */
export const isManager = (user: RoleUser): boolean =>
  Boolean(isUsersDoc(user) && Array.isArray(user?.roles) && user!.roles!.some((r) => ['admin', 'manager'].includes(r)))

/** Admin only — matrix row 17 pins transaction writes (refunds) to admin. */
export const isAdminOnly = (user: RoleUser): boolean =>
  Boolean(isUsersDoc(user) && Array.isArray(user?.roles) && user!.roles!.includes('admin'))

/** Matrix row 17: staff+ read all transactions; writes are admin-only. */
export const transactionsAccess = {
  read: ({ req }: AccessArgs) => isStaff(req.user as RoleUser),
  create: ({ req }: AccessArgs) => isAdminOnly(req.user as RoleUser),
  update: ({ req }: AccessArgs) => isAdminOnly(req.user as RoleUser),
  delete: ({ req }: AccessArgs) => isAdminOnly(req.user as RoleUser),
}

/**
 * Matrix row 19: staff+ read every address; customers read their own
 * (`customer` field is the plugin-ecommerce ownership link). create/update/
 * delete keep the plugin defaults (owner or manager+).
 */
export const staffOrOwnAddressRead = ({ req }: AccessArgs): boolean | Where => {
  const user = req.user as (RoleUser & { id?: unknown }) | undefined
  if (isStaff(user)) return true
  if (!user || user.id === undefined) return false
  return { customer: { equals: user.id } }
}


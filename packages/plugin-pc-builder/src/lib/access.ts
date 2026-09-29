import type { TypedUser } from 'payload'

type RoleUser = { roles?: string[] | null } | null | undefined

/** Matrix roles (11-access-security.md): staff can read operational content. */
export const isStaff = (user: RoleUser): boolean =>
  Boolean(user && Array.isArray(user.roles) && user.roles.some((r) => ['admin', 'manager', 'staff'].includes(r)))

/** Manager+ write per the access matrix; staff is read-only on builder content. */
export const isManager = (user: RoleUser): boolean =>
  Boolean(user && Array.isArray(user.roles) && user.roles.some((r) => ['admin', 'manager'].includes(r)))

export const isStaffReq = (user: TypedUser | null): boolean =>
  isStaff(user as { roles?: string[] | null } | null)

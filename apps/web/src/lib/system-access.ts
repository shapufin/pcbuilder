import type { Access, Payload, PayloadRequest } from 'payload'

/**
 * Audit 2026-11-18 (H1/H2/L3): access rules for Payload's built-in surfaces
 * that the collection-level matrix (11-access-security.md) did not cover.
 *
 * Customers share the `users` auth collection with staff, so every
 * Payload-provided surface that defaults to "any authenticated user" —
 * the admin panel, query presets, locked documents — must be pinned to
 * staff explicitly.
 */

type RoleUser = { roles?: string[] | null } | null | undefined

const STAFF_ROLES = ['admin', 'manager', 'staff']

const isStaffUser = (user: RoleUser): boolean =>
  Boolean(user && Array.isArray(user.roles) && user.roles.some((r) => STAFF_ROLES.includes(r)))

const staffOnly: Access = ({ req }) => isStaffUser(req.user as RoleUser)

/** `users.access.admin` — customers may sign in to the storefront, never `/admin`. */
export const canAccessAdminPanel = ({ req }: { req: PayloadRequest }): boolean =>
  isStaffUser(req.user as RoleUser)

/** Root `queryPresets.access` — presets are a staff tool (shared filters in list views). */
export const queryPresetsAccess = {
  read: staffOnly,
  create: staffOnly,
  update: staffOnly,
  delete: staffOnly,
}

/**
 * `payload-locked-documents` has no config-level access option; it is added
 * during sanitization with "any authenticated user" read, which leaks staff
 * ids and the documents they are editing. Narrow read at init — Payload reads
 * `collection.config.access` per operation, so the patch is live.
 */
export const restrictLockedDocuments = (payload: Pick<Payload, 'collections'>): void => {
  const locked = (payload.collections as Record<string, { config: { access: Record<string, unknown> } } | undefined>)[
    'payload-locked-documents'
  ]
  if (!locked) return
  locked.config.access = { ...locked.config.access, read: staffOnly }
}

/** Cookie-auth CSRF allowlist: localhost is a dev convenience, never trusted in production. */
export const allowedCsrfOrigins = (env: Record<string, string | undefined>): string[] => {
  const origins = [env.BMR_URL?.replace(/\/+$/, '')]
  if (env.NODE_ENV !== 'production') origins.push('http://localhost:3000', 'http://127.0.0.1:3000')
  return origins.filter((o): o is string => Boolean(o))
}

/**
 * Permission-aware admin nav (audit 2026-11-18 H3). Pure helpers so the
 * rules are unit-tested; ModernAdminNav feeds them `useAuth()` data.
 */

type Perm = boolean | { permission?: boolean } | undefined
type EntityPerms = Record<string, { read?: Perm; update?: Perm } | undefined>
export type NavPermissions = { collections?: EntityPerms; globals?: EntityPerms } | null | undefined

const allowed = (p: Perm): boolean => (typeof p === 'object' && p !== null ? p.permission === true : p === true)

/** Custom views → the entity (and operation) whose data they expose or change. */
const CUSTOM_VIEW_GUARD: Record<string, { kind: 'collections' | 'globals'; slug: string; op: 'read' | 'update' }> = {
  '/admin/compatibility-rules-manager': { kind: 'collections', slug: 'compatibility-rules', op: 'read' },
  '/admin/build-stats': { kind: 'collections', slug: 'configured-builds', op: 'read' },
  '/admin/plugins': { kind: 'globals', slug: 'store-settings', op: 'update' },
  '/admin/design-system': { kind: 'globals', slug: 'theme', op: 'read' },
}

export const canSeeNavHref = (href: string, permissions: NavPermissions): boolean => {
  if (!permissions) return false
  const custom = CUSTOM_VIEW_GUARD[href]
  if (custom) return allowed(permissions[custom.kind]?.[custom.slug]?.[custom.op])
  const m = /^\/admin\/(collections|globals)\/([^/?#]+)/.exec(href)
  if (!m) return false
  const kind = m[1] as 'collections' | 'globals'
  return allowed(permissions[kind]?.[m[2]!]?.read)
}

const ROLE_LABEL: [string, string][] = [
  ['admin', 'Administrator'],
  ['manager', 'Manager'],
  ['staff', 'Staff'],
]

export const navIdentity = (
  user: { email?: string | null; name?: string | null; roles?: string[] | null } | null | undefined,
): { name: string; email: string; initials: string } => {
  if (!user) return { name: 'Signed out', email: '', initials: '–' }
  const role = ROLE_LABEL.find(([r]) => user.roles?.includes(r))?.[1] ?? 'Member'
  const display = user.name?.trim()
  const source = display || role
  const words = source.split(/\s+/).filter(Boolean)
  const initials = (words.length > 1 ? words[0]![0]! + words[1]![0]! : source.slice(0, 2)).toUpperCase()
  return { name: display ? `${display} · ${role}` : role, email: user.email ?? '', initials }
}

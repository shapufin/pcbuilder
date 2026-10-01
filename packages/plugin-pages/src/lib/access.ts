import type { Access } from 'payload'

export const isManager: Access = ({ req }) =>
  Boolean(
    (req.user as { roles?: string[] } | null)?.roles?.some((r) => ['admin', 'manager'].includes(r)),
  )

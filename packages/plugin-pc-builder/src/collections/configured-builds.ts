import { APIError } from 'payload'
import type { CollectionConfig, PayloadRequest } from 'payload'
import { getBuilderIndex } from '../lib/builder-index'
import {
  buildDocSlotsToBuildSlots,
  findIncompleteSlotReasons,
  findUnknownSlotRefs,
  newShareId,
  priceBuildFromIndex,
  slotsToSelections,
} from '../lib/builds'
import { requireStaff } from '../lib/builder-index'
import { createRuleEngine } from '@buildmyrig/lib'

// 11-access-security.md matrix: customer = own CRUD, staff/manager = read,
// admin = write. Staff+ therefore see every build (incl. guest drafts);
// only admins may update/delete builds they don't own.
const roleIn = (user: { roles?: string[] | null } | null | undefined, roles: string[]): boolean =>
  Boolean(user && Array.isArray(user.roles) && roles.some((r) => user.roles?.includes(r)))

const buildReadAccess = ({
  req,
}: {
  req: { user?: { id?: unknown; roles?: string[] | null } | null }
}) => {
  if (!req.user) return false
  if (roleIn(req.user, ['admin', 'manager', 'staff'])) return true
  return { user: { equals: req.user.id } }
}

const buildWriteAccess = ({
  req,
}: {
  req: { user?: { id?: unknown; roles?: string[] | null } | null }
}) => {
  if (!req.user) return false
  if (roleIn(req.user, ['admin'])) return true
  return { user: { equals: req.user.id } }
}

/**
 * Server-side gate for every configured-build write (admin or endpoint):
 * re-validates the slot set against the current rule index and recomputes
 * the price snapshot from live variant prices. Client snapshots are display-only.
 * Throws APIError(422) so REST callers get the reasons instead of a generic 500.
 */
/** Server-managed fields — readOnly in admin is UI-only, so real field-level
 *  access.update blocks owner REST writes (shareId/status/price spoofing).
 *  Internal writes go through payload.update({overrideAccess:true}), which
 *  bypasses field access, so claim/resolve/webhook paths are unaffected. */
const serverManaged = { update: () => false } as const

const validateConfiguredBuild = async ({
  data,
  req,
  operation,
}: {
  data: { slots?: { category?: unknown; components?: unknown[] }[] | null; [key: string]: unknown }
  req: PayloadRequest
  operation?: string
}) => {
  // create-only: `data` is partial on update, so an absent shareId here would
  // rotate the token and 404 every share link (review entry 44).
  if (operation !== 'update' && (data.shareId == null || data.shareId === '')) data.shareId = newShareId()
  if (!data.slots) return
  const index = await getBuilderIndex(req.payload)
  const engine = createRuleEngine(index)
  const slots = buildDocSlotsToBuildSlots(data.slots)
  const unknown = findUnknownSlotRefs(index, slots)
  if (unknown.length > 0) {
    throw new APIError(`Build references unknown parts: ${unknown.join('; ')}`, 422)
  }
  const incomplete = findIncompleteSlotReasons(index, slots)
  if (incomplete.length > 0) {
    throw new APIError(`Build is incomplete: ${incomplete.join('; ')}`, 422)
  }
  const { errors, warnings } = engine.validateSelections(slotsToSelections(slots))
  if (errors.length > 0) {
    throw new APIError(`Build is incompatible: ${errors.map((e) => e.message).join('; ')}`, 422)
  }
  const componentIds = slots.flatMap((s) => s.componentIds)
  data.priceSnapshot = priceBuildFromIndex(index, componentIds)
  data.validationSnapshot = { errors: [], warnings, rulesVersion: index.rulesVersion }
}

export const ConfiguredBuilds: CollectionConfig = {
  slug: 'configured-builds',
  access: {
    read: buildReadAccess,
    // Guest saves go through POST /api/builder/builds (rate-limited, validated,
    // creates with overrideAccess). Raw REST create is admin/manager-only so
    // anonymous callers can't bypass the rate limiter or spoof user/status/shareId.
    create: ({ req }: { req: PayloadRequest }) => requireStaff(req.user),
    update: buildWriteAccess,
    delete: buildWriteAccess,
  },
  hooks: {
    beforeChange: [validateConfiguredBuild],
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'user', 'status', 'priceSnapshot'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: serverManaged,
    },
    {
      name: 'shareId',
      type: 'text',
      unique: true,
      index: true,
      access: serverManaged,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'slots',
      type: 'array',
      required: true,
      fields: [
        { name: 'category', type: 'relationship', relationTo: 'component-categories', required: true },
        { name: 'components', type: 'relationship', relationTo: 'components', hasMany: true },
      ],
    },
    {
      name: 'priceSnapshot',
      type: 'number',
      access: serverManaged,
      admin: { readOnly: true, description: 'Display-only; recomputed server-side at checkout' },
    },
    {
      name: 'validationSnapshot',
      type: 'json',
      access: serverManaged,
      admin: { readOnly: true, description: '{ errors, warnings, rulesVersion } from the rule engine at save time' },
    },
    {
      name: 'status',
      type: 'select',
      options: ['draft', 'addedToCart', 'ordered'],
      defaultValue: 'draft',
      access: serverManaged,
    },
  ],
}

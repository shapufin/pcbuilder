import type { Access, Field } from 'payload'
import { isStaff } from './access.ts'

/**
 * Matrix row 13 (11-access-security.md): public reads get the `inStock`
 * boolean via the product view — never the raw `inventory` count. The
 * plugin-ecommerce `inventory` field has no access override and
 * `InventoryConfig` exposes no hook for one, so the field is patched here.
 *
 * Server-side consumers are unaffected: the local API defaults
 * `overrideAccess: true`, and the settlement/availability paths use the db
 * adapter directly (see 01-commerce.md).
 */
type ReadAccess = Access

const hasSubFields = (field: Field): field is Field & { fields: Field[] } =>
  (field.type === 'group' || field.type === 'row' || field.type === 'array' || field.type === 'collapsible') &&
  Array.isArray((field as { fields?: unknown }).fields)

export const maskInventoryRead = (fields: Field[], read: ReadAccess): Field[] =>
  fields.map((field) => {
    if (!field || typeof field !== 'object') return field
    if (field.type === 'tabs') {
      return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: maskInventoryRead(tab.fields, read) })) }
    }
    const out: Field = hasSubFields(field) ? ({ ...field, fields: maskInventoryRead(field.fields, read) } as Field) : field
    const named = out as { name?: string; access?: Record<string, unknown> }
    if (named.name !== 'inventory') return out
    return { ...out, access: { ...(named.access ?? {}), read } } as Field
  })

/** Staff-and-up read access — the shape the plugin's `access` config expects. */
export const staffReadOnly = ({ req }: { req: { user?: unknown } }): boolean =>
  isStaff(req.user as { roles?: string[] | null } | null)

import type { Access, CollectionConfig, Field, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { extendItemsFields, validateBuildsAtCheckout } from '../lib/line-item-hooks.ts'
import { isManager, isStaff } from '../lib/access.ts'
import { orderEmailsAfterChange } from '../emails/order-emails.ts'
import { lowStockAlertAfterChange } from '../emails/low-stock.ts'
import { orderPurchaseAfterChange } from '../analytics/order-purchase.ts'

type RoleReq = { req?: { user?: { roles?: string[] | null } | null } | undefined }

const managerWrite = ({ req }: RoleReq): boolean => isManager(req?.user ?? null)
const staffStatusWrite = ({ req }: RoleReq): boolean => isStaff(req?.user ?? null)

/**
 * Entry 20 review round (user-approved): staff fulfilment per
 * 11-access-security.md — staff may move orders through processing/completed
 * only; cancelled/refunded (and anything else) stay manager+; refunds are
 * admin-only via the transactions field rule. Entry-21 review: terminal
 * states are one-way for staff — no resurrecting cancelled/refunded orders
 * (an unchanged status is still allowed so a whole-form save on a terminal
 * order doesn't 400).
 */
export const restrictStaffStatus = async ({
  data,
  req,
  operation,
  originalDoc,
}: {
  data: Record<string, unknown> | { status?: string | null }
  req?: { user?: { roles?: string[] | null } | null } | undefined
  operation?: string
  originalDoc?: { status?: unknown } | null
}): Promise<void> => {
  if (operation !== 'update') return
  const user = req?.user ?? null
  if (!user || isManager(user)) return
  if (!isStaff(user)) return
  const status = (data as { status?: unknown }).status
  if (status === undefined) return
  const previous = (originalDoc ?? {}).status
  if (status === previous) return
  if (previous === 'cancelled' || previous === 'refunded') {
    throw new APIError(
      `Staff may not change orders in terminal status '${String(previous)}' (manager-only)`,
      400,
    )
  }
  if (status !== 'processing' && status !== 'completed') {
    throw new APIError(
      `Staff may only set order status to processing or completed (got '${String(status)}')`,
      400,
    )
  }
}

/**
 * Field access pinning for the orders override: every named field except
 * `status` is manager+-only on update (staff is collection-update-eligible but
 * must not touch amounts/addresses/items); `status` admits staff+. Fields that
 * already carry a stricter plugin rule (e.g. transactions: admin-only) are
 * left untouched. Recurses tabs/groups/rows like extendItemsFields.
 */
const pinOrderFieldWrites = (fields: Field[]): Field[] =>
  fields.map((field) => {
    if (!field || typeof field !== 'object') return field
    if (field.type === 'tabs') {
      return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: pinOrderFieldWrites(tab.fields) })) }
    }
    let out: Field = field
    if (field.type === 'group' || field.type === 'row') {
      out = { ...field, fields: pinOrderFieldWrites(field.fields) } as Field
    }
    const named = out as { name?: string; access?: { update?: unknown } }
    if (!named.name) return out
    if (named.name === 'status') {
      return { ...out, access: { ...(named.access ?? {}), update: staffStatusWrite } } as Field
    }
    if (named.access?.update) return out
    return { ...out, access: { ...(named.access ?? {}), update: managerWrite } } as Field
  })

/**
 * orders collection override (plugin-ecommerce defaultCollection):
 * - Entry 15 owner read (customer id OR customerEmail match) + staff read;
 * - Entry 20 review: staff status-only update (see pinOrderFieldWrites +
 *   restrictStaffStatus) — create/delete stay manager+ (plugin default);
 * - Phase 2e composite line validation at checkout (validateBuildsAtCheckout);
 * - Entry 20 confirmation/shipping emails (orderEmailsAfterChange).
 */
export const ordersCollectionOverride = ({
  defaultCollection,
}: {
  defaultCollection: CollectionConfig
}): CollectionConfig =>
  ({
    ...defaultCollection,
    fields: pinOrderFieldWrites(
      extendItemsFields([
        ...defaultCollection.fields,
        // Entry 44 review (I4): the spec'd order-level breakdown + applied
        // discount code, populated by the settlement webhook from the
        // charge-time transaction snapshot (carts stay mutable mid-payment).
        {
          type: 'tabs',
          tabs: [
            {
              label: 'Pricing',
              fields: [
                { name: 'subtotal', type: 'number', admin: { readOnly: true } },
                { name: 'discountTotal', type: 'number', admin: { readOnly: true } },
                { name: 'shippingTotal', type: 'number', admin: { readOnly: true } },
                { name: 'taxTotal', type: 'number', admin: { readOnly: true } },
                {
                  name: 'discountCode',
                  type: 'relationship',
                  relationTo: 'discount-codes' as never,
                  admin: { readOnly: true },
                },
              ],
            },
          ],
        } as Field,
      ]),
    ),
    access: {
      ...defaultCollection.access,
      read: (({ req }: { req: PayloadRequest }) => {
        if (!req.user) return false
        if (isStaff(req.user as { roles?: string[] | null } | null)) return true
        const user = req.user as { id: number | string; email?: string | null }
        return user.email
          ? {
              or: [
                { customer: { equals: user.id } },
                { customerEmail: { equals: user.email } },
              ],
            }
          : { customer: { equals: user.id } }
      }) as Access,
      update: (({ req }: { req: PayloadRequest }) =>
        Boolean(req.user && isStaff(req.user as { roles?: string[] | null } | null))) as Access,
    },
    hooks: {
      ...defaultCollection.hooks,
      beforeChange: [
        ...(defaultCollection.hooks?.beforeChange ?? []),
        validateBuildsAtCheckout,
        restrictStaffStatus,
      ],
      // Entry 20: confirmation on creation, shipping notice on
      // processing → completed (never throws — see emails/order-emails.ts).
      // Entry 23: server-side purchase event (analytics/order-purchase.ts)
      // and low-stock crossing alert (emails/low-stock.ts) — same
      // never-throws policy: they run inside settlement.
      afterChange: [
        ...(defaultCollection.hooks?.afterChange ?? []),
        orderEmailsAfterChange,
        orderPurchaseAfterChange,
        lowStockAlertAfterChange,
      ],
    },
  }) as CollectionConfig

/**
 * Low-stock staff alert (12-integrations-ops.md plan spec:
 * `low-stock-alert` template). Fires on order creation by the SYSTEM only —
 * webhook settlement / confirm poll (req.user is absent); staff manual
 * creates never decrement inventory, so a projected level read there would
 * be wrong (isStaff covers admin/manager/staff).
 *
 * Stock is read pre-decrement: settlement creates the order (afterChange
 * runs inside payload.create) BEFORE the inventory $inc loop, so `after` is
 * the projected post-settlement level. Crossing rule: alert only when stock
 * moves from above LOW_STOCK_MAX to at-or-below it — products parked at/below
 * the threshold (e.g. seeded defaults) would otherwise alert on every order.
 *
 * One aggregated email per order to STAFF_ALERT_EMAIL (missing env → logged
 * dry-run skip). NEVER throws — like the other order hooks, a failed alert
 * must not break settlement or staff updates.
 */

import { isStaff } from '../lib/access.ts'
import type { EmailLogger } from './resend.ts'
import { sendResendEmail } from './resend.ts'
import { lowStockAlertHtml, type LowStockRow } from './templates.ts'

/** Same threshold as Build Stats' low-stock metric (plugin-pc-builder has its
 * own copy — cross-plugin imports are banned by the boundary lint). */
export const LOW_STOCK_MAX = 5

type RoleUser = { roles?: string[] | null } | null | undefined

type TargetLike =
  | { id?: number | string; title?: string | null; inventory?: number | null }
  | number
  | string
  | null
  | undefined

type OrderItemLike = {
  quantity?: number | null
  product?: TargetLike
  variant?: TargetLike
  buildName?: string | null
}

type LowStockOrderDoc = { id?: number | string; items?: OrderItemLike[] | null }

type PayloadLike = {
  logger: EmailLogger
  findByID?: (args: {
    collection: string
    id: number | string
    depth?: number
    req?: unknown
  }) => Promise<Record<string, unknown> | null>
}

export type LowStockAfterChangeArgs = {
  doc: LowStockOrderDoc
  operation?: 'create' | 'update' | 'delete' | string
  req?: { payload: PayloadLike; user?: RoleUser }
}

type ResolvedTarget = { key: string; title: string; current: number }

const resolveOne = async (
  raw: TargetLike,
  kind: 'variants' | 'products',
  payload: PayloadLike,
  req: unknown,
): Promise<ResolvedTarget | null> => {
  let target: Record<string, unknown> | null = null
  if (raw && typeof raw === 'object') {
    target = raw as Record<string, unknown>
  } else if (typeof raw === 'number' || (typeof raw === 'string' && raw !== '')) {
    try {
      target = (await payload.findByID?.({ collection: kind, id: raw, req })) ?? null
    } catch {
      return null
    }
  }
  if (!target || target.id === undefined || target.id === null) return null
  const inventory = target.inventory
  if (typeof inventory !== 'number' || !Number.isFinite(inventory)) return null
  const id = String(target.id)
  const title =
    typeof target.title === 'string' && target.title
      ? target.title
      : `${kind === 'variants' ? 'Variant' : 'Product'} #${id}`
  return { key: `${kind}:${id}`, title, current: inventory }
}

export const lowStockAlertAfterChange = async ({
  doc,
  operation,
  req,
}: LowStockAfterChangeArgs): Promise<void> => {
  const payload = req?.payload
  if (!payload?.logger) return
  const logger = payload.logger
  if (operation !== 'create') return
  if (isStaff(req?.user ?? null)) return

  const to = process.env.STAFF_ALERT_EMAIL
  if (!to) {
    logger.info('[low-stock] STAFF_ALERT_EMAIL not set — dry-run, alert skipped')
    return
  }

  try {
    // Re-read at depth 1 so product/variant ids come back populated
    // (title + inventory); falls back to the raw items on failure.
    let items = doc.items ?? []
    if (doc.id !== undefined && payload.findByID) {
      try {
        const full = await payload.findByID({ collection: 'orders', id: doc.id, depth: 1, req })
        if (Array.isArray(full?.items)) items = full.items as OrderItemLike[]
      } catch {
        // keep raw items
      }
    }

    const aggregate = new Map<string, { title: string; current: number; qty: number }>()
    for (const item of items) {
      const qty =
        typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0
          ? item.quantity
          : 0
      if (!qty) continue
      const hasVariant = item.variant !== null && item.variant !== undefined && item.variant !== ''
      const resolved = await resolveOne(
        hasVariant ? item.variant : item.product,
        hasVariant ? 'variants' : 'products',
        payload,
        req,
      )
      if (!resolved) continue
      const prev = aggregate.get(resolved.key)
      if (prev) prev.qty += qty
      else aggregate.set(resolved.key, { title: resolved.title, current: resolved.current, qty })
    }

    const rows: LowStockRow[] = [...aggregate.values()]
      .map((entry) => ({ ...entry, after: entry.current - entry.qty }))
      .filter((row) => row.current > LOW_STOCK_MAX && row.after <= LOW_STOCK_MAX)
    if (rows.length === 0) return

    const orderId = String(doc.id ?? '?')
    await sendResendEmail(
      {
        to,
        subject: `Low stock alert: ${rows.length} item${rows.length === 1 ? '' : 's'} at or below ${LOW_STOCK_MAX}`,
        html: lowStockAlertHtml({ orderId, threshold: LOW_STOCK_MAX, rows }),
      },
      logger,
    )
  } catch (error) {
    logger.error(`[low-stock] alert for order #${String(doc.id)} failed: ${String(error)}`)
  }
}

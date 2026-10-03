import type { Payload } from 'payload'

/**
 * Line-item extension registry — the shop ↔ builder integration point
 * (docs/buildmyrig-plan/05-plugin-contracts.md). plugin-shop iterates
 * registered types when recomputing cart totals and validating orders;
 * plugin-pc-builder registers 'configured-build' at config time.
 * Neither plugin imports the other; both depend on this module only.
 */

export interface ResolvedLine {
  /** price in cents for ONE unit of this line (quantity applied by caller) */
  price: number
  subItems: { componentId: string; quantity: number }[]
  /** how many physical units staff must pick at fulfillment */
  fulfillmentUnits: number
}

/** One inventory decrement target at settlement (variant wins over product). */
export interface StockUnit {
  variant?: string | number
  product?: string | number
  quantity: number
}

export interface LineItemType {
  slug: string
  label: string
  /** re-resolves price + sub-items server-side; throws to reject the line */
  resolveLine: (
    line: { configuredBuild?: unknown; quantity?: number; [key: string]: unknown },
    payload: Payload,
  ) => Promise<ResolvedLine>
  /**
   * Inventory units to decrement at settlement, per ONE unit of the line
   * (callers multiply by line quantity). Composite lines have no
   * product/variant of their own — without this hook the settlement loop
   * cannot decrement their stock.
   */
  resolveStockUnits?: (
    line: { configuredBuild?: unknown; quantity?: number; [key: string]: unknown },
    payload: Payload,
  ) => Promise<StockUnit[]>
  fulfillmentPickUnits?: (line: { configuredBuild?: unknown; [key: string]: unknown }) => { componentId: string; quantity: number }[]
}

const registry = new Map<string, LineItemType>()

export const registerLineItemType = (type: LineItemType): void => {
  registry.set(type.slug, type)
}

export const getLineItemType = (slug: string): LineItemType | null => registry.get(slug) ?? null

export const getLineItemTypes = (): LineItemType[] => [...registry.values()]

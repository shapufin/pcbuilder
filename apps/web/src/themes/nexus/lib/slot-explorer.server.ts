import { getPayloadClient } from '@/lib/shop'

/**
 * Entry 71 (Nexus) — slot-explorer data resolution shared by the
 * `nexusSlotExplorer` block renderer and the standalone /explorer route.
 *
 * Each slot maps to a product `categories` slug. Slot products come from
 * per-slot overrides in the block (depth-populated relationships) and fall
 * back to the first published product in the mapped category. Slots with
 * no product still render — clicking them navigates to the category page.
 */

export type ExplorerSlotKey =
  | 'gpu'
  | 'cpu'
  | 'cooling'
  | 'ram'
  | 'storage'
  | 'power'
  | 'case'
  | 'motherboard'

export type ExplorerSlot = {
  key: ExplorerSlotKey
  /** Category slug used for the browse-fallback link. */
  categorySlug: string
  /** Long label on the slot card. */
  label: string
  /** Short socket label (mono, top of the slot). */
  slotName: string
  /** Position on the 16:10 board, in percent. */
  pos: { left: number; top: number; width: number; height: number }
  product?: { slug: string; title: string }
}

/** Slot key → product category slug (seed slugs are plural English names). */
const SLOT_CATEGORY: Record<ExplorerSlotKey, string> = {
  gpu: 'gpus',
  cpu: 'cpu',
  cooling: 'cooling',
  ram: 'ram',
  storage: 'storage',
  power: 'psus',
  case: 'cases',
  motherboard: 'motherboards',
}

const SLOT_DEFS: Omit<ExplorerSlot, 'product' | 'categorySlug'>[] = [
  { key: 'motherboard', label: 'Logic Board', slotName: 'E-ATX Base Plane', pos: { left: 3, top: 10, width: 15, height: 80 } },
  { key: 'cpu', label: 'Compute Engine', slotName: 'LGA1700 Socket 0', pos: { left: 24, top: 12, width: 17, height: 30 } },
  { key: 'cooling', label: 'Fluidic Cooling', slotName: 'Cryo-Block Array', pos: { left: 24, top: 48, width: 17, height: 18 } },
  { key: 'ram', label: 'Hi-Freq Memory', slotName: 'Dual DDR5 DIMM 0/1', pos: { left: 45, top: 12, width: 13, height: 54 } },
  { key: 'gpu', label: 'Graphics Accelerator', slotName: 'PCIe 5.0 x16 Primary', pos: { left: 24, top: 72, width: 44, height: 20 } },
  { key: 'storage', label: 'DirectStorage NVMe', slotName: 'Gen5 M.2 Key-M', pos: { left: 62, top: 12, width: 14, height: 20 } },
  { key: 'power', label: 'Titanium Power Spine', slotName: '24-Pin ATX Header', pos: { left: 80, top: 12, width: 17, height: 54 } },
  { key: 'case', label: 'Chassis Frame', slotName: 'ATX Mid-Tower Envelope', pos: { left: 72, top: 72, width: 25, height: 20 } },
]

type OverrideRow = {
  slot?: ExplorerSlotKey
  product?: { slug?: string; title?: string } | number | null
}

export async function resolveSlotProducts(overrides?: OverrideRow[] | null): Promise<ExplorerSlot[]> {
  const bySlot = new Map<ExplorerSlotKey, { slug: string; title: string }>()
  for (const row of overrides ?? []) {
    if (row?.slot && row.product && typeof row.product === 'object' && row.product.slug) {
      bySlot.set(row.slot, { slug: row.product.slug, title: row.product.title ?? row.product.slug })
    }
  }

  const missing = SLOT_DEFS.filter((d) => !bySlot.has(d.key))
  if (missing.length > 0) {
    const payload = await getPayloadClient()
    await Promise.all(
      missing.map(async (d) => {
        const catSlug = SLOT_CATEGORY[d.key]
        const cat = (
          await payload.find({
            collection: 'categories',
            where: { slug: { equals: catSlug } },
            limit: 1,
            depth: 0,
          })
        ).docs[0]
        if (!cat) return
        const product = (
          await payload.find({
            collection: 'products',
            where: {
              and: [
                { category: { equals: cat.id } },
                { _status: { equals: 'published' } },
              ],
            },
            limit: 1,
            depth: 0,
            sort: 'createdAt',
          })
        ).docs[0]
        if (product?.slug) {
          bySlot.set(d.key, { slug: product.slug, title: product.title ?? product.slug })
        }
      }),
    )
  }

  return SLOT_DEFS.map((d) => ({
    ...d,
    categorySlug: SLOT_CATEGORY[d.key],
    ...(bySlot.has(d.key) ? { product: bySlot.get(d.key) } : {}),
  }))
}

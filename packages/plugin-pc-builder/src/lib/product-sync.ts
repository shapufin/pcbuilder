import type { Payload } from 'payload'
import { clearComponentLink, productLinkFor } from './product-links.ts'

interface ComponentIdDoc {
  id: string | number
}

/** Postgres ids are integers; payload's typed ops reject string ids. */
const numericId = (value: string | number, what: string): number => {
  const id = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(id)) throw new Error(`product-sync: non-numeric ${what} id ${String(value)}`)
  return id
}

/** Unlinks every product pointing at the given component. */
export const clearProductsForComponent = async (
  payload: Payload,
  componentId: string | number,
): Promise<void> => {
  const linked = await payload.find({
    collection: 'products',
    where: { component: { equals: componentId } },
    limit: 100,
    overrideAccess: true,
    depth: 0,
  })
  for (const product of linked.docs) {
    await payload.update({
      collection: 'products',
      id: product.id,
      data: clearComponentLink(),
      overrideAccess: true,
    })
  }
}

/**
 * Keeps products.isComponent/component in sync with a component's variant binding.
 * Never throws for missing products (component may exist before its product during seeding).
 */
export const syncComponentProductLink = async (
  payload: Payload,
  doc: ComponentIdDoc,
): Promise<void> => {
  const comp = (await payload.findByID({
    collection: 'components',
    id: numericId(doc.id, 'component'),
    depth: 1,
    overrideAccess: true,
  })) as ComponentIdDoc & { productVariant?: unknown }
  const targetProductId = productLinkFor(comp)

  const linked = await payload.find({
    collection: 'products',
    where: { component: { equals: doc.id } },
    limit: 100,
    overrideAccess: true,
    depth: 0,
  })
  for (const product of linked.docs) {
    if (targetProductId == null || String(product.id) !== targetProductId) {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: clearComponentLink(),
        overrideAccess: true,
      })
    }
  }

  if (targetProductId != null) {
    await payload.update({
      collection: 'products',
      id: numericId(targetProductId, 'product'),
      data: { isComponent: true, component: numericId(doc.id, 'component') },
      overrideAccess: true,
    })
  }
}

/** Backfill: re-sync every component (used by the backfill script). */
export const syncAllProductLinks = async (payload: Payload): Promise<number> => {
  const comps = await payload.find({
    collection: 'components',
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })
  for (const comp of comps.docs) {
    await syncComponentProductLink(payload, comp as ComponentIdDoc)
  }
  return comps.docs.length
}

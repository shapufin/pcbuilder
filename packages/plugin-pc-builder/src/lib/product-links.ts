interface ComponentLinkDoc {
  id?: unknown
  productVariant?: unknown
}

/**
 * Product id a component links to (A1: component → variant → product).
 * Returns null for id-only variants — callers must refetch with depth first.
 */
export const productLinkFor = (doc: ComponentLinkDoc | null | undefined): string | null => {
  const pv = doc?.productVariant
  if (pv == null) return null
  if (typeof pv !== 'object') return null
  const prod = (pv as { product?: unknown }).product
  if (prod == null) return null
  if (typeof prod === 'object' && 'id' in prod) return String((prod as { id: unknown }).id)
  if (typeof prod === 'string' || typeof prod === 'number') return String(prod)
  return null
}

/** Payload update value that unlinks a product from the builder. */
export const clearComponentLink = (): { isComponent: boolean; component: null } => ({
  isComponent: false,
  component: null,
})

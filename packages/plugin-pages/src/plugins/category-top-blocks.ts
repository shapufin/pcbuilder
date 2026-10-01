import type { BlockSlug, Config, Field } from 'payload'

/**
 * Bounded top block zone on category pages (10-blocks-pages.md):
 * Hero + CtaBanner only — the listing template below is hardcoded.
 * Moved from apps/web/src/collections/Pages.ts in entry 19 (Step B);
 * entry 22 switched it to config.blocks blockReferences + filterOptions.
 */
const topBlockSlugs: BlockSlug[] = ['hero', 'ctaBanner']

export const categoryTopBlocksPlugin = () => (config: Config): Config => {
  const topBlocks: Field = {
    name: 'topBlocks',
    type: 'blocks',
    blocks: [],
    blockReferences: topBlockSlugs,
    // Server-side enforcement: any config.blocks block would otherwise resolve
    // into this bounded zone via direct API writes (drawer filtering alone
    // does not validate saves).
    filterOptions: () => topBlockSlugs,
    admin: { initCollapsed: true },
  }
  let patched = false
  const collections = config.collections?.map((collection) => {
    if (collection && typeof collection === 'object' && 'slug' in collection && collection.slug === 'categories') {
      patched = true
      return { ...collection, fields: [...(collection.fields ?? []), topBlocks] }
    }
    return collection
  })
  // Review-19 guard: silent no-op if categories is missing (shopPlugin disabled
  // or reordered after pagesPlugin) — the admin zone would vanish unnoticed.
  if (!patched) {
    console.warn(
      '[plugin-pages] categories collection not found — topBlocks zone not added (is shopPlugin enabled and ordered before pagesPlugin?)',
    )
  }
  return { ...config, collections }
}

/**
 * Backfill `blockName` on every page-layout block that has a summary field.
 *
 * Payload shows `blockName` as the block row's title in the editor, so this is
 * what makes a page read "Hero — Build your perfect rig" instead of a wall of
 * "Hero / Hero / Rich Text". Custom row-label components are not viable in
 * 3.90.2 (probe 2026-10-22), so the title is data.
 *
 *   pnpm --filter @buildmyrig/web repair:block-names
 *
 * Idempotent: only writes when a block's name is missing or differs.
 */
const { getPayload } = await import('payload')
const config = await (await import('./payload.config.ts')).default
const payload = await getPayload({ config })

const { blockNameFor } = await import('./lib/block-name.ts')

type LayoutBlock = { blockType?: string; blockName?: string | null } & Record<string, unknown>

const pages = await payload.find({ collection: 'pages', limit: 500, depth: 0, overrideAccess: true })

let changed = 0
for (const page of pages.docs) {
  const layout = (page as { layout?: LayoutBlock[] | null }).layout
  if (!Array.isArray(layout) || layout.length === 0) continue

  let dirty = false
  const next = layout.map((block) => {
    const name = blockNameFor(block)
    if (!name || block.blockName === name) return block
    dirty = true
    return { ...block, blockName: name }
  })
  if (!dirty) continue

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { layout: next } as never,
    overrideAccess: true,
  })
  changed += 1
  payload.logger.info(`block-names: named blocks on page "${String((page as { slug?: string }).slug)}"`)
}

payload.logger.info(
  changed > 0 ? `block-names: updated ${changed} page(s).` : 'block-names: nothing to do.',
)

export {}

import { blockRegistry } from './registry'

type BlockShape = { blockType?: string } & Record<string, unknown>

/**
 * Renders a page's `layout` array. Unknown blockTypes are skipped with a
 * server warning (never crash the page — 10-blocks-pages.md).
 */
export async function PageRenderer({ layout }: { layout?: BlockShape[] | null }) {
  if (!layout?.length) return null
  return (
    <>
      {layout.map((block, i) => {
        const Comp = blockRegistry[block.blockType ?? '']
        if (!Comp) {
          console.warn(`[PageRenderer] unknown blockType "${block.blockType}" — skipped`)
          return null
        }
        return <Comp key={`${block.blockType}-${i}`} block={block} />
      })}
    </>
  )
}

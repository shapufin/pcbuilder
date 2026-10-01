import { renderBlocks, type BlockShape } from './renderBlocks'

/**
 * Renders a page's `layout` array. Unknown blockTypes are skipped with a
 * server warning (never crash the page — 10-blocks-pages.md); the shared
 * walk lives in renderBlocks (also used by the Section container, entry 22).
 */
export async function PageRenderer({ layout }: { layout?: BlockShape[] | null }) {
  return <>{renderBlocks(layout)}</>
}

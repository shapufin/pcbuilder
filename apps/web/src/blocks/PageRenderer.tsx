import { getThemeAssets } from '@/lib/theme.server'
import { renderBlocks, type BlockShape } from './renderBlocks'

/**
 * Renders a page's `layout` array. Unknown blockTypes are skipped with a
 * server warning (never crash the page — 10-blocks-pages.md); the shared
 * walk lives in renderBlocks (also used by the Section container, entry 22).
 *
 * The active theme pack is passed through so a pack can override a shared
 * block (`hero`) instead of requiring content to be re-authored per theme.
 * `getThemeAssets` is request-cached, so this costs nothing extra.
 */
export async function PageRenderer({ layout }: { layout?: BlockShape[] | null }) {
  const { pack } = await getThemeAssets()
  return <>{renderBlocks(layout, { pack })}</>
}

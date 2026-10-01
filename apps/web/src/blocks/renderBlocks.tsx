import type { ReactNode } from 'react'
import { blockRegistry } from './registry'

export type BlockShape = { blockType?: string } & Record<string, unknown>

/**
 * Walks a blocks array through the registry (docs/buildmyrig-plan/10-blocks-pages.md).
 * Shared by PageRenderer (page layout) and the Section container (nested
 * blocks). Unknown blockTypes are skipped with a server warning — never
 * crash the page.
 */
export function renderBlocks(layout?: BlockShape[] | null, source = 'PageRenderer'): ReactNode {
  if (!layout?.length) return null
  return layout.map((block, i) => {
    const Comp = blockRegistry[block.blockType ?? '']
    if (!Comp) {
      console.warn(`[${source}] unknown blockType "${block.blockType}" — skipped`)
      return null
    }
    return <Comp key={`${block.blockType}-${i}`} block={block} />
  })
}

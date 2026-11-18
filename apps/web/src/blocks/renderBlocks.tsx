import type { ReactNode } from 'react'
import { resolveBlockComponent } from './resolveBlock'
import { registerNestedRenderer, type BlockShape } from './nested'

export type { BlockShape }

export type RenderOptions = {
  /** Theme pack from the theme global — lets a pack override a shared block. */
  pack?: string | null
  /** Caller label used in the unknown-block warning. */
  source?: string
}

/**
 * Walks a blocks array through the theme-aware resolver
 * (docs/buildmyrig-plan/10-blocks-pages.md). Shared by PageRenderer (page
 * layout) and the Section container (nested blocks). Unknown blockTypes are
 * skipped with a server warning — never crash the page.
 *
 * The second argument stays compatible with the old `(layout, source)` call
 * shape because Section passes a plain string.
 */
/**
 * Pack-bound blocks (`aether*`) read pack-scoped CSS variables. Placed on a
 * page while another pack is active they used to resolve undefined variables
 * and lose their styling (audit 2026-11-18 M6). Such blocks get a
 * `display: contents` scope element that re-exposes their pack's variables.
 * (Nexus variables are global, so nexus* blocks need no scope.)
 */
const SCOPED_PACKS = ['aether'] as const
const blockPackOf = (slug: string | undefined): string | null =>
  SCOPED_PACKS.find((p) => slug?.startsWith(p)) ?? null

export function renderBlocks(
  layout?: BlockShape[] | null,
  sourceOrOptions: string | RenderOptions = 'PageRenderer',
): ReactNode {
  if (!layout?.length) return null
  const options: RenderOptions =
    typeof sourceOrOptions === 'string' ? { source: sourceOrOptions } : sourceOrOptions
  const source = options.source ?? 'PageRenderer'

  return layout.map((block, i) => {
    const Comp = resolveBlockComponent(block.blockType, options.pack)
    if (!Comp) {
      console.warn(`[${source}] unknown blockType "${block.blockType}" — skipped`)
      return null
    }
    const key = `${block.blockType}-${i}`
    const blockPack = blockPackOf(block.blockType)
    if (blockPack && blockPack !== options.pack) {
      return (
        <div key={key} className="block-pack-scope" data-block-pack={blockPack}>
          <Comp block={block} />
        </div>
      )
    }
    return <Comp key={key} block={block} />
  })
}

// Columns/Section render nested layouts through nested.ts (no import cycle).
registerNestedRenderer((layout, source) => renderBlocks(layout, source))

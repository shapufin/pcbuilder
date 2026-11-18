import type { ComponentType, ReactNode } from 'react'

/**
 * Late-bound seams for blocks that render other blocks (audit 2026-11-18 R6).
 *
 * Columns/Section render nested layouts and the rich-text converters render
 * embedded blocks — but the renderer and registry import those very
 * components, so a direct import formed module cycles. The renderer and
 * registry register themselves here at module load; leaf blocks only ever
 * import this file.
 */
export type BlockShape = { blockType?: string } & Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent = ComponentType<{ block: any }>
type Renderer = (layout: BlockShape[] | null | undefined, source: string) => ReactNode

let renderer: Renderer | null = null
let registry: Record<string, BlockComponent> = {}

export const registerNestedRenderer = (fn: Renderer): void => {
  renderer = fn
}
export const registerBlockRegistry = (map: Record<string, BlockComponent>): void => {
  registry = map
}

/** Render a nested blocks array (Columns/Section). Null until the renderer module has loaded. */
export const renderNested = (layout: BlockShape[] | null | undefined, source: string): ReactNode => {
  if (renderer) return renderer(layout, source)
  if (layout?.length) console.warn(`[${source}] nested blocks skipped — renderBlocks module not loaded`)
  return null
}

export const getBlockRegistry = (): Record<string, BlockComponent> => registry

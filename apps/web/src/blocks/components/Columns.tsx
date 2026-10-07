import { renderBlocks, type BlockShape } from '../renderBlocks'

type ColumnsLayout = {
  layout?: string | null
  gap?: string | null
}

type Column = {
  blocks?: BlockShape[] | null
}

export type ColumnsBlockData = {
  blockType?: string
  columns?: Column[] | null
  layout?: ColumnsLayout | null
}

/**
 * Columns container (entry 74): each column stacks nested blocks side by
 * side. layout/gap arrive from select fields, are validated against closed
 * allowlists, and emit as data-* attributes styled by blocks.css — raw editor
 * input never reaches a style property (same contract as Section).
 */
const layoutSteps = ['equal', 'wide-left', 'wide-right'] as const
const gapSteps = ['sm', 'md', 'lg'] as const

const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

export function Columns({ block }: { block: ColumnsBlockData }) {
  const columns = block.columns ?? []
  if (!columns.length) return null
  const layout = pick(layoutSteps, block.layout?.layout, 'equal')
  const gap = pick(gapSteps, block.layout?.gap, 'md')
  return (
    <div className="blk-columns" data-layout={layout} data-gap={gap}>
      {columns.map((col, i) => (
        <div key={i} className="blk-columns__col">
          {renderBlocks(col.blocks, 'Columns')}
        </div>
      ))}
    </div>
  )
}

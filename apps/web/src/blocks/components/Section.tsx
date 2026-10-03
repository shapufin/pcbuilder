import { renderBlocks, type BlockShape } from '../renderBlocks'

type SectionLayout = {
  padding?: string | number | null
  background?: string | null
  width?: string | number | null
}

export type SectionBlockData = {
  blockType?: string
  blocks?: BlockShape[] | null
  layout?: SectionLayout | null
}

/**
 * Section container (entry 22, Phase 5 Step D): nests any other block and
 * carries the layout tab (padding / background / width). Values arrive from
 * select fields and are validated against closed allowlists, then emitted as
 * data-* attributes styled by blocks.css — raw editor input never reaches a
 * style property or a stylesheet.
 */
const paddingSteps = ['none', 'sm', 'md', 'lg', 'xl'] as const
const bgTones = ['page', 'alt', 'raised'] as const
const widthSteps = ['container', 'wide', 'full'] as const

const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

export function Section({ block }: { block: SectionBlockData }) {
  const layout = block.layout ?? {}
  const padding = pick(paddingSteps, layout.padding, 'md')
  const background = pick(bgTones, layout.background, 'page')
  const width = pick(widthSteps, layout.width, 'container')
  return (
    <section className="blk-section" data-padding={padding} data-bg={background}>
      <div className="blk-section__inner" data-width={width}>
        {renderBlocks(block.blocks, 'Section')}
      </div>
    </section>
  )
}

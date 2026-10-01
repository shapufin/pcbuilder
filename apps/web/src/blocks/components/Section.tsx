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
 * select fields but are resolved through closed lookup tables onto theme CSS
 * vars — raw editor input never reaches a style property.
 */
const paddingByStep: Record<string, string> = {
  none: '0',
  sm: 'var(--space-5)',
  md: 'var(--space-7)',
  lg: 'var(--space-8)',
  xl: 'var(--space-9)',
}

const backgroundByTone: Record<string, string> = {
  page: 'transparent',
  alt: 'var(--color-surface)',
  raised: 'var(--color-surface-raised)',
}

const widthByStep: Record<string, string> = {
  container: '1200px',
  wide: '1440px',
  full: 'none',
}

export function Section({ block }: { block: SectionBlockData }) {
  const layout = block.layout ?? {}
  const padding = paddingByStep[String(layout.padding ?? 'md')] ?? paddingByStep.md
  const background = backgroundByTone[String(layout.background ?? 'page')] ?? backgroundByTone.page
  const maxWidth = widthByStep[String(layout.width ?? 'container')] ?? widthByStep.container
  return (
    <section style={{ background, paddingBlock: padding, paddingInline: 'var(--space-5)' }}>
      <div style={{ maxWidth, margin: '0 auto' }}>{renderBlocks(block.blocks, 'Section')}</div>
    </section>
  )
}

import { describe, expect, it } from 'vitest'
import { blockNameFor } from './block-name.ts'

describe('blockNameFor (plan 1.3 pivot)', () => {
  it('names a block after its summary field', () => {
    expect(blockNameFor({ blockType: 'hero', heading: 'Build your perfect rig' })).toBe(
      'Build your perfect rig',
    )
    expect(blockNameFor({ blockType: 'videoEmbed', title: 'Rig assembly timelapse' })).toBe(
      'Rig assembly timelapse',
    )
  })

  it('returns null when the block has no summary field', () => {
    // Payload keeps showing the block's own label in that case
    expect(blockNameFor({ blockType: 'columns' })).toBeNull()
    expect(blockNameFor({ blockType: 'section' })).toBeNull()
    expect(blockNameFor({ blockType: 'richText' })).toBeNull()
  })

  it('returns null for empty, non-string or unknown values', () => {
    expect(blockNameFor({ blockType: 'hero', heading: '   ' })).toBeNull()
    expect(blockNameFor({ blockType: 'hero', heading: { root: {} } })).toBeNull()
    expect(blockNameFor({ blockType: 'notARealBlock', heading: 'x' })).toBeNull()
    expect(blockNameFor({})).toBeNull()
  })

  it('collapses whitespace and truncates long headings', () => {
    expect(blockNameFor({ blockType: 'hero', heading: 'A\n\n  B' })).toBe('A B')
    const long = blockNameFor({ blockType: 'hero', heading: 'a'.repeat(80) })
    expect(long).toHaveLength(60)
    expect(long!.endsWith('…')).toBe(true)
  })
})

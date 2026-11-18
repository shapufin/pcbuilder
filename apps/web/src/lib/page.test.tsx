import { describe, expect, it } from 'vitest'
import { layoutHasH1 } from './page-heading.ts'

describe('layoutHasH1 (#675)', () => {
  it('detects the hero blocks that render the page <h1>', () => {
    expect(layoutHasH1([{ blockType: 'hero' }])).toBe(true)
    expect(layoutHasH1([{ blockType: 'aetherHero' }])).toBe(true)
    expect(layoutHasH1([{ blockType: 'nexusHero' }])).toBe(true)
  })

  it('reports a missing h1 for rich-text/CTA-only pages', () => {
    expect(layoutHasH1([{ blockType: 'richText' }, { blockType: 'ctaBanner' }])).toBe(false)
    expect(layoutHasH1([{ blockType: 'faq' }])).toBe(false)
  })

  it('treats an empty or absent layout as h1-less', () => {
    expect(layoutHasH1([])).toBe(false)
    expect(layoutHasH1(null)).toBe(false)
    expect(layoutHasH1(undefined)).toBe(false)
  })
})


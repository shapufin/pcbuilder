import { describe, expect, it } from 'vitest'
import { pageBlockSlugs } from '@buildmyrig/plugin-pages'
import { Pages } from './Pages'

/**
 * Step D review F2 — pages.layout must pin its allow-list (blockReferences
 * alone declares what exists, filterOptions decides what validates): without
 * it any blockType present in config.blocks would pass payload's
 * validateBlocksFilterOptions, letting a future plugin's block ride into
 * page layouts (docs/buildmyrig-plan/10-blocks-pages.md, #156).
 */
describe('Pages layout field allow-list', () => {
  const layout = Pages.fields.find(
    (f) => f.type === 'blocks' && 'name' in f && f.name === 'layout',
  ) as Extract<(typeof Pages.fields)[number], { type: 'blocks' }>

  it('#156 layout references the 14 page slugs and filterOptions pins the same set', () => {
    expect(pageBlockSlugs).toHaveLength(14)
    expect(layout.blocks).toEqual([])
    expect([...(layout.blockReferences ?? [])]).toEqual([...pageBlockSlugs])

    expect(typeof layout.filterOptions).toBe('function')
    const filterOptions = layout.filterOptions as unknown as () => unknown
    expect(filterOptions()).toEqual([...pageBlockSlugs])
  })
})

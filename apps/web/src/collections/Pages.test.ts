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

  it('#156 layout references the 28 page slugs (14 core + 4 nexus + 6 aether + columns + 3 commerce blocks) and filterOptions pins the same set', () => {
    expect(pageBlockSlugs).toHaveLength(28)
    expect(layout.blocks).toEqual([])
    expect([...(layout.blockReferences ?? [])]).toEqual([...pageBlockSlugs])

    expect(typeof layout.filterOptions).toBe('function')
    const filterOptions = layout.filterOptions as unknown as () => unknown
    expect(filterOptions()).toEqual([...pageBlockSlugs])
  })
})

/**
 * Phase 4 — speed & safety. A page layout is the longest form in the admin
 * (up to 28 block types), so an autosave interval is the difference between a
 * lost tab costing one block and costing the whole page. Trash makes the
 * delete button recoverable for the same reason.
 */
describe('Pages speed & safety config (#702 - #703)', () => {
  it('#702 pages autosave drafts every 800ms', () => {
    const versions = Pages.versions
    expect(versions, 'versions must be configured').toBeTruthy()
    const drafts = typeof versions === 'object' ? versions.drafts : undefined
    expect(drafts, 'versions.drafts must be configured').toBeTruthy()
    const autosave = typeof drafts === 'object' ? drafts.autosave : undefined
    expect(autosave, 'autosave must be enabled').toBeTruthy()
    if (autosave && typeof autosave === 'object') {
      expect(autosave.interval).toBe(800)
    }
  })

  it('#703 pages ship trash', () => {
    expect(Pages.trash).toBe(true)
  })
})

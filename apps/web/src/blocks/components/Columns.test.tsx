import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Columns } from './Columns'

vi.mock('../registry', async () => {
  const { jsx } = await import('react/jsx-runtime')
  return {
    blockRegistry: {
      hero: ({ block }: { block: { heading?: string } }) => jsx('h1', { children: block.heading ?? '' }),
    },
  }
})

/**
 * Entry 74 — columns container: each column renders nested blocks through the
 * registry; layout/gap selects are validated against closed allowlists and
 * emitted as data-* attributes styled by blocks.css (same contract as
 * Section — raw editor input never reaches a style property).
 */
describe('Columns block renderer', () => {
  it('#455 renders each column nested blocks and applies layout/gap data attributes', () => {
    const html = renderToStaticMarkup(
      <Columns
        block={{
          blockType: 'columns',
          layout: { layout: 'wide-left', gap: 'lg' },
          columns: [
            { blocks: [{ blockType: 'hero', heading: 'Left' }] },
            { blocks: [{ blockType: 'hero', heading: 'Right' }] },
          ],
        }}
      />,
    )
    expect(html).toContain('data-layout="wide-left"')
    expect(html).toContain('data-gap="lg"')
    expect(html).toContain('<h1>Left</h1>')
    expect(html).toContain('<h1>Right</h1>')
  })

  it('#455b junk/missing layout values fall back to equal/md; empty columns render nothing', () => {
    const html = renderToStaticMarkup(
      <Columns
        block={{
          blockType: 'columns',
          layout: { layout: '<script>x</script>', gap: 'evil' },
          columns: [{ blocks: [] }, { blocks: [] }],
        }}
      />,
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('data-layout="equal"')
    expect(html).toContain('data-gap="md"')

    const bare = renderToStaticMarkup(<Columns block={{ blockType: 'columns' }} />)
    expect(bare).toBe('')
  })

  it('#455c nested unknown blockTypes warn with the [Columns] label', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderToStaticMarkup(
      <Columns
        block={{
          blockType: 'columns',
          columns: [{ blocks: [{ blockType: 'ghost' }] }, { blocks: [] }],
        }}
      />,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Columns] unknown blockType'))
    warn.mockRestore()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Section } from './Section'

vi.mock('../registry', async () => {
  const { jsx } = await import('react/jsx-runtime')
  return {
    blockRegistry: {
      hero: ({ block }: { block: { heading?: string } }) => jsx('h1', { children: block.heading ?? '' }),
    },
  }
})

/**
 * Step D (entry 22) - Section container: nested blocks render through the
 * registry; layout tab values are validated against closed allowlists and
 * emitted as data-* attributes (styled by blocks.css) — never raw editor
 * input into styles.
 */
describe('Section block renderer', () => {
  it('#152 applies layout values as data attributes and renders nested blocks', () => {
    const html = renderToStaticMarkup(
      <Section
        block={{
          blockType: 'section',
          blocks: [{ blockType: 'hero', heading: 'Nested heading' }],
          layout: { padding: 'lg', background: 'alt', width: 'wide' },
        }}
      />,
    )
    expect(html).toContain('data-padding="lg"')
    expect(html).toContain('data-bg="alt"')
    expect(html).toContain('data-width="wide"')
    expect(html).toContain('<h1>Nested heading</h1>')
  })

  it('#152b missing or junk layout values fall back to defaults (md/page/container)', () => {
    const html = renderToStaticMarkup(
      <Section
        block={{
          blockType: 'section',
          blocks: [],
          layout: { padding: '<script>x</script>', background: 'evil', width: 999 },
        }}
      />,
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('data-padding="md"')
    expect(html).toContain('data-bg="page"')
    expect(html).toContain('data-width="container"')

    const bare = renderToStaticMarkup(<Section block={{ blockType: 'section' }} />)
    expect(bare).toContain('data-padding="md"')
    expect(bare).toContain('data-width="container"')
  })

  it('#157b nested unknown blockTypes warn with the [Section] label (not [PageRenderer])', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderToStaticMarkup(
      <Section block={{ blockType: 'section', blocks: [{ blockType: 'ghost' }] }} />,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Section] unknown blockType'))
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('[PageRenderer]'))
    warn.mockRestore()
  })
})

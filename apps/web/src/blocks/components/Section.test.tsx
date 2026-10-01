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
 * registry; layout tab values map onto closed CSS-var lookups (never raw
 * editor input into styles).
 */
describe('Section block renderer', () => {
  it('#152 applies layout values as CSS vars and renders nested blocks', () => {
    const html = renderToStaticMarkup(
      <Section
        block={{
          blockType: 'section',
          blocks: [{ blockType: 'hero', heading: 'Nested heading' }],
          layout: { padding: 'lg', background: 'alt', width: 'wide' },
        }}
      />,
    )
    expect(html).toContain('var(--space-8)') // lg
    expect(html).toContain('var(--color-surface)') // alt
    expect(html).toContain('1440px') // wide
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
    expect(html).toContain('var(--space-7)') // md default
    expect(html).toContain('transparent') // page default
    expect(html).toContain('1200px') // container default

    const bare = renderToStaticMarkup(<Section block={{ blockType: 'section' }} />)
    expect(bare).toContain('var(--space-7)')
    expect(bare).toContain('1200px')
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

import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderBlocks } from './renderBlocks'

vi.mock('./registry', async () => {
  const { jsx } = await import('react/jsx-runtime')
  return {
    blockRegistry: {
      hero: ({ block }: { block: { heading?: string } }) => jsx('h1', { children: block.heading ?? '' }),
      faq: ({ block }: { block: { heading?: string } }) =>
        jsx('section', { 'data-block': 'faq', children: block.heading ?? '' }),
    },
  }
})

/**
 * Step D (entry 22) - shared block list renderer: PageRenderer (page layout)
 * and the Section container both walk arrays through the same registry with
 * the never-crash contract for unknown blockTypes.
 */
describe('renderBlocks', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('#151 renders known blocks in order and skips unknown blockTypes with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const html = renderToStaticMarkup(
      <>
        {renderBlocks([
          { blockType: 'hero', heading: 'One' },
          { blockType: 'doesNotExist' },
          { blockType: 'faq', heading: 'Two' },
        ])}
      </>,
    )
    expect(html).toBe('<h1>One</h1><section data-block="faq">Two</section>')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown blockType'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('doesNotExist'))
  })

  it('#157 warn messages carry the caller label (PageRenderer default, Section override)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderToStaticMarkup(<>{renderBlocks([{ blockType: 'ghost' }])}</>)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[PageRenderer] unknown blockType'))

    warn.mockClear()
    renderToStaticMarkup(<>{renderBlocks([{ blockType: 'ghost' }], 'Section')}</>)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Section] unknown blockType'))
  })

  it('#151b missing or empty layout renders nothing', () => {
    expect(renderToStaticMarkup(<>{renderBlocks(undefined)}</>)).toBe('')
    expect(renderToStaticMarkup(<>{renderBlocks(null)}</>)).toBe('')
    expect(renderToStaticMarkup(<>{renderBlocks([])}</>)).toBe('')
  })
})

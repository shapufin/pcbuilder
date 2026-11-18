import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const { mockResolve } = vi.hoisted(() => ({ mockResolve: vi.fn() }))
vi.mock('./resolveBlock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./resolveBlock')>()
  mockResolve.mockImplementation(actual.resolveBlockComponent)
  return { ...actual, resolveBlockComponent: mockResolve }
})

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

  it('#693 passes the active pack to the resolver, and keeps the string call shape working', () => {
    mockResolve.mockClear()
    renderToStaticMarkup(<>{renderBlocks([{ blockType: 'hero', heading: 'X' }], { pack: 'aether' })}</>)
    expect(mockResolve).toHaveBeenCalledWith('hero', 'aether')

    mockResolve.mockClear()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderToStaticMarkup(<>{renderBlocks([{ blockType: 'ghost' }], 'Section')}</>)
    // the legacy call shape still resolves (no pack) and still labels the warning
    expect(mockResolve).toHaveBeenCalledWith('ghost', undefined)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Section] unknown blockType'))
  })
})

describe('renderBlocks — pack-bound blocks outside their pack (audit 2026-11-18 M6)', () => {
  const fake = (() => null) as never
  it('#777 an aether* block under another pack is wrapped in its token scope', () => {
    mockResolve.mockReturnValueOnce(({ block }: { block: { heading?: string } }) => <p>{block.heading}</p>)
    const html = renderToStaticMarkup(<>{renderBlocks([{ blockType: 'aetherHero', heading: 'Lab' }], { pack: 'nexus' })}</>)
    expect(html).toContain('data-block-pack="aether"')
    expect(html).toContain('<p>Lab</p>')
  })
  it('#778 no wrapper inside its own pack, and none for shared blocks', () => {
    mockResolve.mockReturnValueOnce(({ block }: { block: { heading?: string } }) => <p>{block.heading}</p>)
    const own = renderToStaticMarkup(<>{renderBlocks([{ blockType: 'aetherHero', heading: 'Lab' }], { pack: 'aether' })}</>)
    expect(own).not.toContain('data-block-pack')
    const shared = renderToStaticMarkup(<>{renderBlocks([{ blockType: 'hero', heading: 'Hi' }], { pack: 'nexus' })}</>)
    expect(shared).not.toContain('data-block-pack')
    void fake
  })
})

import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import { lexicalEmbedBlockSlugs } from '@buildmyrig/plugin-pages'
import { buildLexicalBlockConverters, lexicalRichTextConverters } from './lexical-converters'

vi.mock('./registry', async () => {
  const { jsx } = await import('react/jsx-runtime')
  return {
    blockRegistry: {
      productGrid: ({ block }: { block: { heading?: string } }) =>
        jsx('div', { 'data-grid': '1', children: block.heading ?? '' }),
    },
  }
})

/**
 * Step D (entry 22) - Lexical embeds: every block the RichTextBlock editor can
 * insert needs a JSX converter, otherwise payload logs a missing-converter
 * error and the content silently drops out of the page.
 */
describe('lexical block converters', () => {
  it('#153 builds one converter per embeddable slug', () => {
    const { blocks } = buildLexicalBlockConverters()
    expect(Object.keys(blocks ?? {}).sort()).toEqual([...lexicalEmbedBlockSlugs].sort())
  })

  it('#153b converts a block node via the registry, null when the registry lacks it', () => {
    const { blocks } = buildLexicalBlockConverters()
    const convert = blocks!.productGrid!
    const args = { node: { fields: { blockType: 'productGrid', heading: 'Teaser' } } }
    const rendered = renderToStaticMarkup(
      (typeof convert === 'function' ? convert(args as never) : convert) as never,
    )
    expect(rendered).toContain('Teaser')

    const missing = blocks!.videoEmbed! // not in the mocked registry
    expect(typeof missing).toBe('function')
    expect((missing as (a: never) => unknown)({ node: { fields: {} } } as never)).toBeNull()
  })

  // Regression (review F1): payload's RichText only merges defaultJSXConverters
  // when `converters` is a function — passing the bare { blocks } object
  // replaces them and every paragraph renders as "unknown node".
  it('#155 payload RichText keeps default converters alongside the embeds', () => {
    const data = {
      root: {
        type: 'root',
        direction: 'ltr',
        format: '',
        version: 1,
        children: [
          {
            type: 'paragraph',
            direction: 'ltr',
            format: '',
            version: 1,
            children: [{ type: 'text', text: 'Hello world', format: '' }],
          },
          {
            type: 'block',
            fields: { blockType: 'productGrid', blockName: 'pg', heading: 'Teaser' },
            format: '',
            version: 1,
          },
        ],
      },
    }
    const html = renderToStaticMarkup(
      <LexicalRichText data={data as never} converters={lexicalRichTextConverters} />,
    )
    expect(html).toContain('Hello world')
    expect(html).toContain('<p')
    expect(html).not.toContain('unknown node')
    expect(html).toContain('Teaser') // embed went through the registry mock
  })
})

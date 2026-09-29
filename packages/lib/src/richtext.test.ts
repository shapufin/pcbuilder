import { describe, expect, it } from 'vitest'
import { lexicalToPlainText, embedUrlFrom, embedUrlFor } from './richtext'

const lexical = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      children: [{ type: 'text', text, format: 0, version: 1 }],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    })),
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

describe('lexicalToPlainText', () => {
  it('joins text nodes across paragraphs', () => {
    expect(lexicalToPlainText(lexical(['Hello world.', 'Second line.']) as never)).toBe('Hello world. Second line.')
  })

  it('walks nested children (bold/link nodes)', () => {
    const doc = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'a ', version: 1 },
              { type: 'link', children: [{ type: 'text', text: 'b', version: 1 }], version: 1 },
              { type: 'text', text: ' c', version: 1 },
            ],
          },
        ],
      },
    }
    expect(lexicalToPlainText(doc as never)).toBe('a b c')
  })

  it('returns — for null/empty docs', () => {
    expect(lexicalToPlainText(null)).toBe('—')
    expect(lexicalToPlainText({ root: { type: 'root', children: [] } } as never)).toBe('—')
  })
})

describe('embedUrlFrom', () => {
  it('converts youtube watch URLs', () => {
    expect(embedUrlFrom('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('converts youtu.be short URLs', () => {
    expect(embedUrlFrom('youtube', 'https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('converts youtube embed URLs (id passthrough)', () => {
    expect(embedUrlFrom('youtube', 'https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('converts vimeo URLs', () => {
    expect(embedUrlFrom('vimeo', 'https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789')
  })

  it('returns null for invalid or foreign URLs', () => {
    expect(embedUrlFrom('youtube', 'not a url')).toBeNull()
    expect(embedUrlFrom('youtube', 'https://example.com/watch?v=1')).toBe('https://www.youtube.com/embed/1')
    expect(embedUrlFrom('vimeo', 'https://example.com/123')).toBeNull()
    expect(embedUrlFrom('youtube', 'https://www.youtube.com/')).toBeNull()
  })
})

describe('embedUrlFor', () => {
  it('detects youtube URLs', () => {
    expect(embedUrlFor('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
    expect(embedUrlFor('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('detects vimeo URLs', () => {
    expect(embedUrlFor('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789')
  })

  it('returns null for unknown hosts (no cross-provider embed)', () => {
    expect(embedUrlFor('https://example.com/watch?v=1')).toBeNull()
    expect(embedUrlFor('https://notyoutube.com/watch?v=1')).toBeNull()
  })

  it('returns null for invalid or empty input', () => {
    expect(embedUrlFor('not a url')).toBeNull()
    expect(embedUrlFor('')).toBeNull()
  })
})

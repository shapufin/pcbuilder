import type { JSXConverters, JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import { lexicalEmbedBlockSlugs } from '@buildmyrig/plugin-pages'
import { blockRegistry, type BlockComponent } from './registry'

type BlockNodeLike = { fields?: Record<string, unknown> } | undefined

/**
 * Lexical `block` node → registry component converters for the RichTextBlock
 * field's BlocksFeature embeds (entry 22, Step D). Every embeddable slug
 * needs one: payload only logs when a blockType has no converter, and the
 * content would silently drop from the rendered page.
 */
export function buildLexicalBlockConverters(
  registry: Record<string, BlockComponent> = blockRegistry,
): JSXConverters {
  const blocks: Record<string, (args: { node?: BlockNodeLike }) => unknown> = {}
  for (const slug of lexicalEmbedBlockSlugs) {
    blocks[slug] = ({ node }) => {
      const Comp = registry[slug]
      if (!Comp) return null
      return <Comp block={node?.fields ?? {}} />
    }
  }
  return { blocks } as unknown as JSXConverters
}

/**
 * Payload's `RichText` only merges `defaultJSXConverters` when `converters`
 * is a FUNCTION — a plain object replaces them outright, so paragraphs /
 * headings / links would all render as "unknown node" (review finding F1).
 * Always pass this wrapper, never the bare `{ blocks }` object.
 */
export const lexicalRichTextConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...buildLexicalBlockConverters(),
})

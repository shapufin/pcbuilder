import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import { lexicalRichTextConverters } from '../lexical-converters'

export function RichTextBlock({ block }: { block: { richtext?: unknown } }) {
  if (!block.richtext) return null
  return (
    <section className="blk blk--narrow">
      <div className="richtext">
        <LexicalRichText data={block.richtext as never} converters={lexicalRichTextConverters} />
      </div>
    </section>
  )
}

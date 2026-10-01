import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import { lexicalRichTextConverters } from '../lexical-converters'

export function RichTextBlock({ block }: { block: { richtext?: unknown } }) {
  if (!block.richtext) return null
  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
      <div
        style={{
          color: 'var(--color-border-strong)',
          lineHeight: 1.7,
          fontSize: 16,
        }}
        className="bmr-richtext"
      >
        <LexicalRichText data={block.richtext as never} converters={lexicalRichTextConverters} />
      </div>
    </section>
  )
}

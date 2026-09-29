import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'

export function RichTextBlock({ block }: { block: { richtext?: unknown } }) {
  if (!block.richtext) return null
  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
      <div
        style={{
          color: '#cbd5e1',
          lineHeight: 1.7,
          fontSize: 16,
        }}
        className="bmr-richtext"
      >
        <LexicalRichText data={block.richtext as never} />
      </div>
    </section>
  )
}

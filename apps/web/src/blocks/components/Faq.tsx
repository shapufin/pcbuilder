import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import { lexicalToPlainText } from '@buildmyrig/lib'
import { serializeJsonLd } from '@/lib/jsonld'

type FaqItem = { question: string; answer?: unknown }

export function Faq({ block }: { block: { heading?: string | null; items?: FaqItem[] | null } }) {
  const items = block.items ?? []
  if (items.length === 0) return null
  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 20px' }}>
        {block.heading ?? 'Frequently asked questions'}
      </h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item, i) => (
          <details
            key={i}
            style={{ border: '1px solid var(--color-surface)', borderRadius: 10, padding: '14px 18px', background: 'var(--color-bg)' }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>{item.question}</summary>
            {item.answer ? (
              <div style={{ color: 'var(--color-text-muted)', marginTop: 10, lineHeight: 1.6, fontSize: 15 }}>
                <LexicalRichText data={item.answer as never} />
              </div>
            ) : null}
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: items.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: lexicalToPlainText(item.answer) },
            })),
          }),
        }}
      />
    </section>
  )
}

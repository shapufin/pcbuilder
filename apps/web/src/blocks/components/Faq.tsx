import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import { lexicalToPlainText } from '@buildmyrig/lib'
import { serializeJsonLd } from '@/lib/jsonld'

type FaqItem = { question: string; answer?: unknown }

export function Faq({ block }: { block: { heading?: string | null; items?: FaqItem[] | null } }) {
  const items = block.items ?? []
  if (items.length === 0) return null
  return (
    <section className="blk blk--narrow">
      <h2 className="blk__title">{block.heading ?? 'Frequently asked questions'}</h2>
      <div className="faq">
        {items.map((item, i) => (
          <details key={i} className="faq__item">
            <summary className="faq__q">{item.question}</summary>
            {item.answer ? (
              <div className="faq__a">
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

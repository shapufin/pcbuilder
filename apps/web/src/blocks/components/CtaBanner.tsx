import Link from 'next/link'

const tones = ['dark', 'indigo', 'slate'] as const

export function CtaBanner({
  block,
}: {
  block: {
    heading?: string
    copy?: string | null
    ctaLabel?: string | null
    ctaUrl?: string | null
    tone?: 'dark' | 'indigo' | 'slate' | null
  }
}) {
  const tone = tones.includes(block.tone ?? 'indigo') ? (block.tone ?? 'indigo') : 'indigo'
  const onAccent = tone === 'indigo'
  return (
    <section className="blk">
      <div className={`cta-banner cta-banner--${tone}`}>
        <h2 className="cta-banner__title">{block.heading}</h2>
        {block.copy ? <p className="cta-banner__copy">{block.copy}</p> : null}
        {block.ctaLabel && block.ctaUrl ? (
          <Link href={block.ctaUrl} className={`btn ${onAccent ? 'btn--light' : 'btn--primary'} btn--lg`}>
            {block.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

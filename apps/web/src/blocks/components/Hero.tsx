import Link from 'next/link'
import { embedUrlFor } from '@buildmyrig/lib'

type Cta = { label: string; url: string; style?: 'primary' | 'secondary' }

const primary: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--color-primary-strong)',
  color: 'var(--color-on-primary)',
  padding: '12px 24px',
  borderRadius: 10,
  fontWeight: 700,
  textDecoration: 'none',
}
const secondary: React.CSSProperties = {
  display: 'inline-block',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '12px 24px',
  borderRadius: 10,
  fontWeight: 600,
  textDecoration: 'none',
}

export function Hero({
  block,
}: {
  block: {
    heading?: string
    subheading?: string
    image?: { url?: string | null; alt?: string | null } | null
    videoUrl?: string | null
    variant?: 'image' | 'split' | 'video'
    align?: 'left' | 'center'
    ctas?: Cta[] | null
  }
}) {
  const { heading, subheading, image, videoUrl, variant = 'image', align = 'center', ctas } = block
  const centered = align === 'center'
  const copy = (
    <div style={{ flex: '1 1 320px', textAlign: centered ? 'center' : 'left' }}>
      <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: '0 0 12px' }}>{heading}</h1>
      {subheading ? <p style={{ color: 'var(--color-text-muted)', fontSize: 18, lineHeight: 1.6, margin: '0 0 24px' }}>{subheading}</p> : null}
      {ctas?.length ? (
        <div style={{ display: 'flex', gap: 12, justifyContent: centered ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
          {ctas.map((cta, i) => {
            const style = cta.style === 'secondary' ? secondary : primary
            const inner = <span style={style}>{cta.label}</span>
            return cta.url.startsWith('/') ? (
              <Link key={i} href={cta.url}>{inner}</Link>
            ) : (
              <a key={i} href={cta.url} target="_blank" rel="noreferrer">{inner}</a>
            )
          })}
        </div>
      ) : null}
    </div>
  )
  const embed = variant === 'video' && videoUrl ? embedUrlFor(videoUrl) : null
  const media = embed ? (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
      <iframe
        src={embed}
        title={heading || 'Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: 14 }}
      />
    </div>
  ) : image?.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.alt ?? ''}
      style={{ width: '100%', borderRadius: 14, border: '1px solid var(--color-surface)' }}
    />
  ) : null

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: variant === 'split' ? '64px 24px' : '80px 24px',
      }}
    >
      {variant === 'split' ? (
        <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
          {copy}
          {media}
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          {media && (align === 'center' || embed) ? (
            <div style={{ maxWidth: 900, margin: '0 auto 32px' }}>{media}</div>
          ) : null}
          {copy}
        </div>
      )}
    </section>
  )
}

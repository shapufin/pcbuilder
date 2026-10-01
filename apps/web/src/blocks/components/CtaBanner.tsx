import Link from 'next/link'

const tones: Record<string, React.CSSProperties> = {
  dark: { background: 'var(--color-bg)', border: '1px solid var(--color-surface)' },
  indigo: { background: 'linear-gradient(120deg, var(--color-primary-hover-strong) 0%, var(--color-primary-strong) 100%)' },
  slate: { background: 'var(--color-surface)' },
}

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
  const tone = tones[block.tone ?? 'indigo'] ?? tones.indigo
  const darkText = block.tone === 'indigo'
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ ...tone, borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px', color: darkText ? 'var(--color-on-primary)' : undefined }}>
          {block.heading}
        </h2>
        {block.copy ? (
          <p style={{ color: darkText ? 'var(--color-text)' : 'var(--color-text-muted)', margin: '0 auto 24px', maxWidth: 640, lineHeight: 1.6 }}>
            {block.copy}
          </p>
        ) : null}
        {block.ctaLabel && block.ctaUrl ? (
          <Link
            href={block.ctaUrl}
            style={{
              display: 'inline-block',
              background: darkText ? 'var(--color-on-primary)' : 'var(--color-primary-strong)',
              color: darkText ? 'var(--color-primary-hover-strong)' : 'var(--color-on-primary)',
              padding: '12px 26px',
              borderRadius: 10,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {block.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

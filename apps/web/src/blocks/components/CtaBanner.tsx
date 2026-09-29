import Link from 'next/link'

const tones: Record<string, React.CSSProperties> = {
  dark: { background: '#020617', border: '1px solid #1e293b' },
  indigo: { background: 'linear-gradient(120deg, #4338ca 0%, #6366f1 100%)' },
  slate: { background: '#1e293b' },
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
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px', color: darkText ? '#fff' : undefined }}>
          {block.heading}
        </h2>
        {block.copy ? (
          <p style={{ color: darkText ? '#e0e7ff' : '#94a3b8', margin: '0 auto 24px', maxWidth: 640, lineHeight: 1.6 }}>
            {block.copy}
          </p>
        ) : null}
        {block.ctaLabel && block.ctaUrl ? (
          <Link
            href={block.ctaUrl}
            style={{
              display: 'inline-block',
              background: darkText ? '#fff' : '#6366f1',
              color: darkText ? '#4338ca' : '#fff',
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

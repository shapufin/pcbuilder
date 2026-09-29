import Link from 'next/link'

export function FeaturedCategory({
  block,
}: {
  block: {
    category?: { slug?: string; title?: string } | null
    image?: { url?: string | null; alt?: string | null } | null
    heading?: string
    copy?: string | null
    ctaLabel?: string | null
  }
}) {
  const { category, image, heading, copy, ctaLabel } = block
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div
        style={{
          display: 'flex',
          gap: 40,
          alignItems: 'center',
          flexWrap: 'wrap',
          border: '1px solid #1e293b',
          borderRadius: 14,
          padding: 32,
          background: 'linear-gradient(120deg, #111827 0%, #0f172a 60%)',
        }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px' }}>{heading ?? category?.title}</h2>
          {copy ? <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>{copy}</p> : null}
          {category?.slug ? (
            <Link
              href={`/shop/${category.slug}`}
              style={{
                display: 'inline-block',
                background: '#6366f1',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {ctaLabel || 'Shop now'}
            </Link>
          ) : null}
        </div>
        {image?.url ? (
          <div style={{ flex: '1 1 280px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt ?? ''} style={{ width: '100%', borderRadius: 12 }} />
          </div>
        ) : null}
      </div>
    </section>
  )
}

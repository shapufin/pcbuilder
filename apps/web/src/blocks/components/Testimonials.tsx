export function Testimonials({
  block,
}: {
  block: {
    heading?: string | null
    items?: { quote: string; name: string; role?: string | null; avatar?: { url?: string | null } | null }[] | null
  }
}) {
  const items = block.items ?? []
  if (items.length === 0) return null
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 20px' }}>{block.heading ?? 'What builders say'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {items.map((item, i) => (
          <figure
            key={i}
            style={{ border: '1px solid #1e293b', borderRadius: 12, padding: 22, margin: 0, background: '#0f172a' }}
          >
            <blockquote style={{ margin: '0 0 16px', color: '#cbd5e1', lineHeight: 1.6, fontSize: 15 }}>
              “{item.quote}”
            </blockquote>
            <figcaption style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.avatar?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatar.url} alt="" width={36} height={36} style={{ borderRadius: '50%' }} />
              ) : null}
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>{item.name}</strong>
                {item.role ? <span style={{ color: '#64748b', fontSize: 13 }}>{item.role}</span> : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

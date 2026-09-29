export function LogosStrip({
  block,
}: {
  block: {
    heading?: string | null
    brands?: { id?: number | string; name?: string; logo?: { url?: string | null } | null }[] | null
  }
}) {
  const brands = block.brands ?? []
  if (brands.length === 0) return null
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', textAlign: 'center' }}>
      {block.heading ? (
        <p style={{ color: '#64748b', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 18 }}>
          {block.heading}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', alignItems: 'center' }}>
        {brands.map((brand, i) =>
          brand.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={brand.id ?? i}
              src={brand.logo.url}
              alt={brand.name ?? ''}
              style={{ height: 32, width: 'auto', opacity: 0.75 }}
            />
          ) : (
            <span key={brand.id ?? i} style={{ color: '#94a3b8', fontWeight: 700, fontSize: 15 }}>
              {brand.name}
            </span>
          ),
        )}
      </div>
    </section>
  )
}

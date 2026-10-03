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
    <section className="blk logos">
      {block.heading ? <p className="logos__heading">{block.heading}</p> : null}
      <div className="logos__row">
        {brands.map((brand, i) =>
          brand.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={brand.id ?? i} src={brand.logo.url} alt={brand.name ?? ''} className="logos__img" />
          ) : (
            <span key={brand.id ?? i} className="logos__name">
              {brand.name}
            </span>
          ),
        )}
      </div>
    </section>
  )
}

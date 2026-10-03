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
    <section className="blk">
      <h2 className="blk__title">{block.heading ?? 'What builders say'}</h2>
      <div className="testimonials">
        {items.map((item, i) => (
          <figure key={i} className="testimonial">
            <blockquote className="testimonial__quote">“{item.quote}”</blockquote>
            <figcaption className="testimonial__author">
              {item.avatar?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatar.url} alt="" width={36} height={36} className="testimonial__avatar" />
              ) : null}
              <div>
                <strong className="testimonial__name">{item.name}</strong>
                {item.role ? <span className="testimonial__role">{item.role}</span> : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

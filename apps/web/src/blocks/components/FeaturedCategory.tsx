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
    <section className="blk">
      <div className="feat-cat">
        <div className="feat-cat__copy">
          <h2 className="blk__title">{heading ?? category?.title}</h2>
          {copy ? <p className="blk__lead">{copy}</p> : null}
          {category?.slug ? (
            <Link href={`/shop/${category.slug}`} className="btn btn--primary">
              {ctaLabel || 'Shop now'}
            </Link>
          ) : null}
        </div>
        {image?.url ? (
          <div className="feat-cat__img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt ?? ''} className="feat-cat__img" />
          </div>
        ) : null}
      </div>
    </section>
  )
}

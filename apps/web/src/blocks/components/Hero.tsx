import Link from 'next/link'
import { embedUrlFor } from '@buildmyrig/lib'

type Cta = { label: string; url: string; style?: 'primary' | 'secondary' }

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
    <div className={`hero__copy${centered ? '' : ' hero__copy--left'}`}>
      <h1 className="hero__title">{heading}</h1>
      {subheading ? <p className="hero__sub">{subheading}</p> : null}
      {ctas?.length ? (
        <div className={`hero__ctas${centered ? '' : ' hero__ctas--left'}`}>
          {ctas.map((cta, i) => {
            const cls = cta.style === 'secondary' ? 'btn btn--secondary btn--lg' : 'btn btn--primary btn--lg'
            return cta.url.startsWith('/') ? (
              <Link key={i} href={cta.url} className={cls}>
                {cta.label}
              </Link>
            ) : (
              <a key={i} href={cta.url} target="_blank" rel="noreferrer" className={cls}>
                {cta.label}
              </a>
            )
          })}
        </div>
      ) : null}
    </div>
  )
  const embed = variant === 'video' && videoUrl ? embedUrlFor(videoUrl) : null
  const media = embed ? (
    <div className="hero__media hero__media--framed">
      <iframe
        src={embed}
        title={heading || 'Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="hero__iframe"
      />
    </div>
  ) : image?.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.url} alt={image.alt ?? ''} className="hero__img" />
  ) : null

  return (
    <section className={`hero${variant === 'split' ? ' hero--split' : ''}`}>
      {variant === 'split' ? (
        <div className="hero__split-inner">
          {copy}
          {media}
        </div>
      ) : (
        <>
          {media ? <div className="hero__media-wrap">{media}</div> : null}
          {copy}
        </>
      )}
    </section>
  )
}

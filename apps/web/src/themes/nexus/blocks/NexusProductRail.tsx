import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'
import { mediaDoc, pickMedia } from '@/lib/media'
import { Price } from '@/components/ui/Price'
import { specMeta } from '../lib/spec-meta'

type RailProduct = {
  id: number | string
  title: string
  slug: string
  priceInEUR?: number | null
  gallery?: unknown[] | null
  specsJson?: Record<string, unknown> | null
  attributeValues?: unknown
}

const tierLabel = (attributeValues: unknown): string | null => {
  if (!Array.isArray(attributeValues)) return null
  for (const entry of attributeValues) {
    if (typeof entry !== 'object' || entry === null) continue
    const { attributeType, value } = entry as { attributeType?: unknown; value?: unknown }
    if (typeof attributeType !== 'object' || attributeType === null) continue
    if ((attributeType as { slug?: unknown }).slug !== 'prebuilt-tier') continue
    const label =
      typeof value === 'object' && value !== null
        ? (value as { displayLabel?: unknown }).displayLabel ?? (value as { value?: unknown }).value
        : null
    if (typeof label === 'string' && label.trim()) return label.trim()
  }
  return null
}

/**
 * Entry 71 — nexusProductRail renderer: latest published products in the
 * block's category (or globally), with spec chips from product specsJson
 * and optional prebuilt-tier chips.
 */
export async function NexusProductRail({
  block,
}: {
  block: {
    eyebrow?: string
    heading?: string
    category?: { id?: number | string; title?: string } | number | null
    limit?: number | null
    showTierChips?: boolean | null
  }
}) {
  const payload = await getPayloadClient()
  const categoryId =
    typeof block.category === 'object' ? block.category?.id : (block.category ?? undefined)
  const where = categoryId
    ? ({ and: [{ category: { equals: categoryId } }, { _status: { equals: 'published' } }] } as never)
    : ({ _status: { equals: 'published' } } as never)
  const products = await payload.find({
    collection: 'products',
    where,
    limit: block.limit && block.limit > 0 ? Math.floor(block.limit) : 6,
    sort: '-createdAt',
    depth: 2,
    select: {
      id: true,
      title: true,
      slug: true,
      priceInEUR: true,
      gallery: true,
      specsJson: true,
      attributeValues: true,
    },
  })

  return (
    <section className="page">
      <div className="nx-rail">
        <div className="nx-section-head">
          {block.eyebrow && <p className="nx-section-eyebrow">{block.eyebrow}</p>}
          <h2 className="nx-section-heading">{block.heading}</h2>
        </div>
        <div className="nx-rail__grid">
          {(products.docs as RailProduct[]).map((p) => {
            const firstMedia = Array.isArray(p.gallery) ? mediaDoc(p.gallery[0]) : null
            const img = pickMedia(firstMedia, 'card', p.title)
            const meta = specMeta(p.specsJson)
            const chips: string[] = []
            if (meta.spScore !== undefined) chips.push(`SP ${meta.spScore}`)
            if (meta.formFactor) chips.push(meta.formFactor)
            if (meta.tdpWatts !== undefined) chips.push(`${meta.tdpWatts}W`)
            const tier = block.showTierChips ? tierLabel(p.attributeValues) : null
            return (
              <Link key={p.id} href={`/product/${p.slug}`} className="nx-product">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element -- CMS media URL
                  <img className="nx-product__img" src={img.url} alt={img.alt} loading="lazy" decoding="async" />
                ) : (
                  <div className="nx-product__img" aria-hidden />
                )}
                <span className="nx-product__body">
                  {tier && <span className="nx-product__eyebrow">{tier}</span>}
                  <h3 className="nx-product__title">{p.title}</h3>
                  {chips.length > 0 && (
                    <span className="nx-product__chips">
                      {chips.map((c) => (
                        <span key={c} className="nx-chip nx-chip--accent">
                          {c}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="nx-product__price">
                    {typeof p.priceInEUR === 'number' ? <Price cents={p.priceInEUR} /> : null}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

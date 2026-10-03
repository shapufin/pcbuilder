import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'
import { ProductCard, ProductCardGrid } from '@/components/ProductCard'
import '@/app/shop/shop.css'

export async function ProductGrid({
  block,
}: {
  block: {
    heading?: string
    category?: { id?: number | string; slug?: string; title?: string } | null
    limit?: number | null
    columns?: string | null
    viewAllLabel?: string | null
  }
}) {
  const payload = await getPayloadClient()
  const where = block.category?.id
    ? ({ and: [{ category: { equals: block.category.id } }, { _status: { equals: 'published' } }] } as never)
    : ({ _status: { equals: 'published' } } as never)
  const products = await payload.find({
    collection: 'products',
    where,
    // Payload limit:0 = unlimited — clamp so an editor's 0 can't dump the
    // whole catalog into one block.
    limit: block.limit && block.limit > 0 ? Math.floor(block.limit) : 4,
    sort: '-createdAt',
    depth: 1,
  })

  const cols = Number(block.columns ?? 3) || 3

  return (
    <section className="page">
      <div className="block-head">
        <h2 className="block-head__title">
          {block.heading ?? block.category?.title ?? 'Latest products'}
        </h2>
        {block.category?.slug ? (
          <Link href={`/shop/${block.category.slug}`} className="block-head__link">
            {block.viewAllLabel || 'View all'} →
          </Link>
        ) : null}
      </div>
      {products.docs.length === 0 ? (
        <p className="page__lead">No products yet.</p>
      ) : (
        <ProductCardGrid cols={cols}>
          {products.docs.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </ProductCardGrid>
      )}
    </section>
  )
}

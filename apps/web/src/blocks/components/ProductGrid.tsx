import Link from 'next/link'
import { getPayloadClient, formatPrice } from '@/lib/shop'

type ProductDoc = {
  id: number | string
  title: string
  slug: string
  priceInEUR?: number | null
  brand?: { name?: string } | null
}

function ProductCard({ product }: { product: ProductDoc }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      style={{
        display: 'block',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: 16,
        background: '#0f172a',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 8 }}>{product.title}</strong>
      {product.brand?.name ? <span style={{ color: '#64748b', fontSize: 13 }}>{product.brand.name}</span> : null}
      <span style={{ display: 'block', color: '#818cf8', marginTop: 8, fontWeight: 700 }}>
        {formatPrice(product)}
      </span>
    </Link>
  )
}

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
    limit: block.limit ?? 4,
    sort: '-createdAt',
    depth: 1,
  })

  const cols = Number(block.columns ?? 3) || 3

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
          {block.heading ?? block.category?.title ?? 'Latest products'}
        </h2>
        {block.category?.slug ? (
          <Link href={`/shop/${block.category.slug}`} style={{ color: '#818cf8', fontSize: 14, textDecoration: 'none' }}>
            {block.viewAllLabel || 'View all'} →
          </Link>
        ) : null}
      </div>
      {products.docs.length === 0 ? (
        <p style={{ color: '#64748b' }}>No products yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 16 }}>
          {products.docs.map((p) => (
            <ProductCard key={p.id} product={p as ProductDoc} />
          ))}
        </div>
      )}
    </section>
  )
}

import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'
import { ProductCard, ProductCardGrid } from '@/components/ProductCard'
import './shop/shop.css'

/**
 * Legacy Phase-1 homepage — used when no published page has isHomepage=true.
 * (Underscore prefix: excluded from routing.)
 */
export async function HomeFallback() {
  const payload = await getPayloadClient()
  const [categories, products] = await Promise.all([
    payload.find({ collection: 'categories', limit: 20, sort: 'title' }),
    payload.find({ collection: 'products', where: { _status: { equals: 'published' } }, limit: 8, sort: '-createdAt', depth: 1 }),
  ])

  return (
    <main className="page">
      <section className="home-hero">
        <h1 className="home-hero__title">Build your perfect rig</h1>
        <p className="home-hero__sub">
          Pre-built gaming and creator PCs, or configure your own — step by step.
        </p>
        <div className="home-hero__ctas">
          <Link href="/builder" className="btn btn--primary btn--lg">Open the builder</Link>
          <Link href="/shop" className="btn btn--secondary btn--lg">Browse components</Link>
        </div>
      </section>

      <h2 className="page__section-title">Categories</h2>
      <div className="category-grid">
        {categories.docs.map((cat) => (
          <Link key={cat.id} href={`/shop/${cat.slug}`} className="category-card">
            <span className="category-card__title">{cat.title}</span>
          </Link>
        ))}
      </div>

      <h2 className="page__section-title page__section-title--gap">Latest products</h2>
      <ProductCardGrid cols={4}>
        {products.docs.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ProductCardGrid>
    </main>
  )
}

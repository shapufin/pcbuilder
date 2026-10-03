import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'
import './shop.css'

/**
 * Shop front door (entry 16): the site-wide "Shop" link used to point at
 * /shop/components, a slug that never existed in the seed (404 caught by the
 * new e2e suite). The landing page lists every category with its product
 * count, so the header/sitemap/CTA target stays stable across seed changes.
 */
export const revalidate = 3600

export const metadata = {
  title: 'Shop | BuildMyRig',
  description: 'Browse gaming PC components by category — CPUs, GPUs, motherboards, memory, storage, PSUs, cases and more.',
}

type ProductRel = { id: string | number } | string | number | null

export default async function ShopIndexPage() {
  const payload = await getPayloadClient()
  const [categories, products] = await Promise.all([
    payload.find({ collection: 'categories', limit: 50, sort: 'title', depth: 0 }),
    payload.find({ collection: 'products', limit: 0, depth: 0, select: { id: true, category: true } }),
  ])

  const counts = new Map<string, number>()
  for (const p of products.docs as { category?: ProductRel }[]) {
    const rel = p.category
    const id =
      rel == null
        ? null
        : typeof rel === 'object' && 'id' in rel
          ? String(rel.id)
          : String(rel)
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return (
    <main className="page">
      <h1 className="page__title">Shop</h1>
      <p className="page__lead">Browse PC components by category.</p>
      <div className="category-grid">
        {(categories.docs as { id: string | number; title: string; slug: string; description?: string | null }[]).map(
          (category) => {
            const count = counts.get(String(category.id)) ?? 0
            return (
              <Link key={category.id} href={`/shop/${category.slug}`} className="category-card">
                <strong className="category-card__title">{category.title}</strong>
                <span className={`category-card__count${count > 0 ? '' : ' category-card__count--empty'}`}>
                  {count > 0 ? `${count} product${count === 1 ? '' : 's'}` : 'No products yet'}
                </span>
                {category.description ? (
                  <span className="category-card__desc">{category.description}</span>
                ) : null}
              </Link>
            )
          },
        )}
      </div>
    </main>
  )
}

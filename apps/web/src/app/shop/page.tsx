import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'

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
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Shop</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Browse PC components by category.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {(categories.docs as { id: string | number; title: string; slug: string; description?: string | null }[]).map(
          (category) => {
            const count = counts.get(String(category.id)) ?? 0
            return (
              <Link
                key={category.id}
                href={`/shop/${category.slug}`}
                style={{
                  border: '1px solid var(--color-surface)',
                  borderRadius: 12,
                  padding: 20,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  background: 'var(--color-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <strong style={{ fontSize: 16 }}>{category.title}</strong>
                <span style={{ color: count > 0 ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', fontSize: 14 }}>
                  {count > 0 ? `${count} product${count === 1 ? '' : 's'}` : 'No products yet'}
                </span>
                {category.description ? (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{category.description}</span>
                ) : null}
              </Link>
            )
          },
        )}
      </div>
    </main>
  )
}

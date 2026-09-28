import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Where } from 'payload'
import { getPayloadClient, formatPrice, productFilters } from '@/lib/shop'

type Props = {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const sp = await searchParams
  const payload = await getPayloadClient()

  const category = (
    await payload.find({ collection: 'categories', where: { slug: { equals: categorySlug } }, limit: 1 })
  ).docs[0]
  if (!category) notFound()

  const { and, sort, page } = productFilters(sp)
  const products = await payload.find({
    collection: 'products',
    where: { and: [{ 'category.slug': { equals: categorySlug } } as Where, ...and] },
    sort,
    page,
    limit: 12,
  })

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const currentBrand = first(sp.brand)
  const qs = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...sp, ...patch })) {
      const val = Array.isArray(v) ? v[0] : v
      if (val) q.set(k, val)
    }
    return `/shop/${categorySlug}?${q.toString()}`
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32 }}>
      <aside>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Brand</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
          {['intel', 'amd', 'nvidia', 'asus', 'corsair', 'samsung'].map((b) => (
            <li key={b}>
              <Link
                href={currentBrand === b ? qs({ brand: undefined }) : qs({ brand: b })}
                style={{ color: currentBrand === b ? '#818cf8' : '#94a3b8', textDecoration: 'none', textTransform: 'capitalize' }}
              >
                {b}
              </Link>
            </li>
          ))}
        </ul>
        <h3 style={{ fontSize: 16, margin: '24px 0 8px' }}>Price</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
          {[
            ['Under €100', { price_lte: '10000' }],
            ['€100–€300', { price_gte: '10000', price_lte: '30000' }],
            ['Over €300', { price_gte: '30000' }],
          ].map(([label, patch]) => (
            <li key={label as string}>
              <Link href={qs(patch as Record<string, string>)} style={{ color: '#94a3b8', textDecoration: 'none' }}>
                {label as string}
              </Link>
            </li>
          ))}
        </ul>
        <h3 style={{ fontSize: 16, margin: '24px 0 8px' }}>Sort</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
          <li><Link href={qs({ sort: 'price_asc' })} style={{ color: '#94a3b8', textDecoration: 'none' }}>Price ↑</Link></li>
          <li><Link href={qs({ sort: 'price_desc' })} style={{ color: '#94a3b8', textDecoration: 'none' }}>Price ↓</Link></li>
        </ul>
      </aside>

      <section>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{category.title}</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>{products.totalDocs} products</p>
        {products.docs.length === 0 ? (
          <p style={{ color: '#64748b' }}>No products match these filters.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {products.docs.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                style={{ border: '1px solid #1e293b', borderRadius: 12, padding: 20, color: '#e2e8f0', textDecoration: 'none', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <strong>{p.title}</strong>
                <span style={{ color: '#818cf8' }}>{formatPrice(p as never)}</span>
              </Link>
            ))}
          </div>
        )}
        {products.totalPages > 1 && (
          <nav style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            {Array.from({ length: products.totalPages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={qs({ page: String(n) })} style={{ color: n === page ? '#818cf8' : '#94a3b8', textDecoration: 'none' }}>
                {n}
              </Link>
            ))}
          </nav>
        )}
      </section>
    </main>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Where } from 'payload'
import { getPayloadClient, formatPrice, productFilters } from '@/lib/shop'
import { JsonLd, itemListJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { PageRenderer } from '@/blocks/PageRenderer'

type Props = {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<import('next').Metadata> {
  const { categorySlug } = await params
  const payload = await getPayloadClient()
  const category = (
    await payload.find({ collection: 'categories', where: { slug: { equals: categorySlug } }, limit: 1 })
  ).docs[0]
  return {
    title: category ? `${category.title} | BuildMyRig` : 'Shop | BuildMyRig',
    description: category?.description ?? undefined,
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const sp = await searchParams
  const payload = await getPayloadClient()

  const category = (
    await payload.find({ collection: 'categories', where: { slug: { equals: categorySlug } }, limit: 1, depth: 2 })
  ).docs[0]
  if (!category) notFound()

  type CategoryWithBlocks = typeof category & {
    topBlocks?: { blockType?: string }[] | null
  }
  const cat = category as CategoryWithBlocks

  const { and, sort, page } = productFilters(sp)
  const [products, brands] = await Promise.all([
    payload.find({
    collection: 'products',
    where: { and: [{ 'category.slug': { equals: categorySlug } } as Where, ...and] },
      sort,
      page,
      limit: 12,
    }),
    // Facet options come from the brands collection — a hardcoded slug list
    // silently renders dead filters the moment seed/admin data diverges.
    payload.find({ collection: 'brands', limit: 100, sort: 'name' }),
  ])

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
    <>
      <PageRenderer layout={cat.topBlocks} />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32 }}>
      <aside>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Brand</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
          {brands.docs.map((b) => (
            <li key={b.slug}>
              <Link
                href={currentBrand === b.slug ? qs({ brand: undefined }) : qs({ brand: b.slug })}
                style={{ color: currentBrand === b.slug ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', textDecoration: 'none' }}
              >
                {b.name}
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
              <Link href={qs(patch as Record<string, string>)} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                {label as string}
              </Link>
            </li>
          ))}
        </ul>
        <h3 style={{ fontSize: 16, margin: '24px 0 8px' }}>Sort</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
          <li><Link href={qs({ sort: 'price_asc' })} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Price ↑</Link></li>
          <li><Link href={qs({ sort: 'price_desc' })} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Price ↓</Link></li>
          <li><Link href={qs({ sort: 'title' })} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Name A–Z</Link></li>
          <li><Link href={qs({ sort: 'newest' })} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Newest</Link></li>
        </ul>
      </aside>

      <section>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{category.title}</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{products.totalDocs} products</p>
        {products.docs.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            No products match these filters.{' '}
            <Link href={`/shop/${categorySlug}`} style={{ color: 'var(--color-primary-hover)' }}>
              Clear filters
            </Link>
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {products.docs.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                style={{ border: '1px solid var(--color-surface)', borderRadius: 12, padding: 20, color: 'var(--color-text)', textDecoration: 'none', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <strong>{p.title}</strong>
                <span style={{ color: 'var(--color-primary-hover)' }}>{formatPrice(p as never)}</span>
              </Link>
            ))}
          </div>
        )}
        {products.totalPages > 1 && (
          <nav style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            {Array.from({ length: products.totalPages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={qs({ page: String(n) })} style={{ color: n === page ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', textDecoration: 'none' }}>
                {n}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <JsonLd
        data={itemListJsonLd(
          category.title,
          products.docs.map((p) => ({ name: p.title, url: `/product/${p.slug}` })),
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Shop', url: '/shop' },
          { name: category.title, url: `/shop/${categorySlug}` },
        ])}
      />
      </main>
    </>
  )
}

import Link from 'next/link'
import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import type { Where } from 'payload'
import { getPayloadClient, productFilters } from '@/lib/shop'
import { buildFacets, facetSelection } from '@/lib/facets'
import { JsonLd, itemListJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { PageRenderer } from '@/blocks/PageRenderer'
import { ProductCard, ProductCardGrid } from '@/components/ProductCard'
import { FilterDrawer } from '@/components/FilterDrawer'
import '../shop.css'

type Props = {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<import('next').Metadata> {
  const { categorySlug } = await params
  const payload = await getPayloadClient()
  const category = (
    await payload.find({
      collection: 'categories',
      where: { and: [{ slug: { equals: categorySlug } }, { _status: { equals: 'published' } }] },
      limit: 1,
    })
  ).docs[0]
  return {
    title: category ? `${category.title} | BuildMyRig` : 'Shop | BuildMyRig',
    description: category?.description ?? undefined,
  }
}

type FilterLink = { label: string; href: string; active?: boolean; count?: number }
type FacetGroup = { name: string; links: FilterLink[] }

function FilterList({ links }: { links: FilterLink[] }) {
  return (
    <ul className="filter-list">
      {links.map((l) => (
        <li key={l.label}>
          <Link href={l.href} aria-current={l.active ? 'true' : undefined}>
            {l.label}
            {typeof l.count === 'number' ? (
              <span className="filter-list__count">{l.count}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Filters({
  brand,
  facets,
  price,
  sort,
}: {
  brand: FilterLink[]
  facets: FacetGroup[]
  price: FilterLink[]
  sort: FilterLink[]
}) {
  return (
    <>
      <p className="filter-group__title">Brand</p>
      <FilterList links={brand} />
      {facets.map((f) => (
        <Fragment key={f.name}>
          <p className="filter-group__title">{f.name}</p>
          <FilterList links={f.links} />
        </Fragment>
      ))}
      <p className="filter-group__title">Price</p>
      <FilterList links={price} />
      <p className="filter-group__title">Sort</p>
      <FilterList links={sort} />
    </>
  )
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const sp = await searchParams
  const payload = await getPayloadClient()

  const category = (
    await payload.find({
      collection: 'categories',
      where: { and: [{ slug: { equals: categorySlug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 2,
    })
  ).docs[0]
  if (!category) notFound()

  type CategoryWithBlocks = typeof category & {
    topBlocks?: { blockType?: string }[] | null
  }
  const cat = category as CategoryWithBlocks

  const { and, sort, page } = productFilters(sp)
  const inCategory: Where[] = [
    { 'category.slug': { equals: categorySlug } } as Where,
    { _status: { equals: 'published' } } as Where,
    ...and,
  ]
  const [attributeTypes, attributeValues, brands] = await Promise.all([
    payload.find({ collection: 'attribute-types', limit: 50, sort: 'name' }),
    payload.find({ collection: 'attribute-values', limit: 200, sort: 'value' }),
    // Facet options come from the brands collection — a hardcoded slug list
    // silently renders dead filters the moment seed/admin data diverges.
    payload.find({ collection: 'brands', limit: 100, sort: 'name' }),
  ])
  const selection = facetSelection(attributeTypes.docs, attributeValues.docs, sp)
  const [products, facetSource] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { and: [...inCategory, ...selection.where] },
      sort,
      page,
      limit: 12,
      // depth 1: card media + brand names need populated docs, not ids.
      depth: 1,
    }),
    // Counts come from the non-facet filtered set (brand/price/search only):
    // a selected facet must not zero out its own sibling counts.
    payload.find({
      collection: 'products',
      where: { and: inCategory },
      limit: 500,
      depth: 0,
      select: { attributeValues: true },
    }),
  ])
  const facets = buildFacets(facetSource.docs, attributeTypes.docs, attributeValues.docs)

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const currentBrand = first(sp.brand)
  const currentSort = first(sp.sort)
  const currentPrice = `${first(sp.price_gte) ?? ''}-${first(sp.price_lte) ?? ''}`
  const qs = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    // `page` resets on any filter/sort change — carrying ?page=5 into a
    // 1-page result set renders "No products match" instead of results.
    for (const [k, v] of Object.entries({ ...sp, page: undefined, ...patch })) {
      const val = Array.isArray(v) ? v[0] : v
      if (val) q.set(k, val)
    }
    return `/shop/${categorySlug}?${q.toString()}`
  }

  const priceBand = (gte?: string, lte?: string) => `${gte ?? ''}-${lte ?? ''}`
  const filters = (
    <Filters
      brand={brands.docs.map((b) => ({
        label: b.name,
        href: currentBrand === b.slug ? qs({ brand: undefined }) : qs({ brand: b.slug }),
        active: currentBrand === b.slug,
      }))}
      facets={facets.map((f) => ({
        name: f.name,
        links: f.options.map((o) => ({
          label: o.label,
          count: o.count,
          href:
            selection.active[f.slug] === o.value
              ? qs({ [f.slug]: undefined })
              : qs({ [f.slug]: o.value }),
          active: selection.active[f.slug] === o.value,
        })),
      }))}
      price={[
        { label: 'Under €100', href: qs({ price_gte: undefined, price_lte: '10000' }), active: currentPrice === priceBand(undefined, '10000') },
        { label: '€100–€300', href: qs({ price_gte: '10000', price_lte: '30000' }), active: currentPrice === priceBand('10000', '30000') },
        { label: 'Over €300', href: qs({ price_gte: '30000', price_lte: undefined }), active: currentPrice === priceBand('30000', undefined) },
      ]}
      sort={[
        { label: 'Price ↑', href: qs({ sort: 'price_asc' }), active: !currentSort || currentSort === 'price_asc' },
        { label: 'Price ↓', href: qs({ sort: 'price_desc' }), active: currentSort === 'price_desc' },
        { label: 'Name A–Z', href: qs({ sort: 'title' }), active: currentSort === 'title' },
        { label: 'Newest', href: qs({ sort: 'newest' }), active: currentSort === 'newest' },
      ]}
    />
  )

  return (
    <>
      <PageRenderer layout={cat.topBlocks} />
      <main className="page">
        <FilterDrawer>{filters}</FilterDrawer>
        <div className="category-layout">
          <aside className="category-layout__sidebar" aria-label="Product filters">
            {filters}
          </aside>

          <section>
            <h1 className="page__title">{category.title}</h1>
            <p className="result-count">{products.totalDocs} products</p>
            {products.docs.length === 0 ? (
              <p className="page__lead">
                No products match these filters.{' '}
                <Link href={`/shop/${categorySlug}`}>Clear filters</Link>
              </p>
            ) : (
              <ProductCardGrid>
                {products.docs.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 4} />
                ))}
              </ProductCardGrid>
            )}
            {products.totalPages > 1 && (
              <nav className="pagination" aria-label="Pagination">
                {Array.from({ length: products.totalPages }, (_, i) => i + 1).map((n) => (
                  <Link key={n} href={qs({ page: String(n) })} aria-current={n === page ? 'page' : undefined}>
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </section>
        </div>

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

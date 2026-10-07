import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'
import { sanitizeSearchQuery } from '@/lib/search'
import { ProductCard, ProductCardGrid } from '@/components/ProductCard'
import '../shop.css'

/**
 * Step A (entry 18): site search — was a planned route with no UI anywhere
 * (header form now submits here, plain GET so it works without JS). Uses
 * payload `contains` (LIKE wrapped by the adapter); the query is sanitised
 * (`search.ts`) so user-supplied wildcards can't widen the scan.
 */

type Props = { searchParams: Promise<{ q?: string | string[] }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolved = await searchParams
  const q = sanitizeSearchQuery(Array.isArray(resolved.q) ? resolved.q[0] : resolved.q)
  return { title: q ? `Search: ${q} | BuildMyRig` : 'Search | BuildMyRig' }
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const query = sanitizeSearchQuery(Array.isArray(params.q) ? params.q[0] : params.q)

  const payload = await getPayloadClient()
  const results = query
    ? await payload.find({
        collection: 'products',
        where: {
          and: [
            { _status: { equals: 'published' } },
            { or: [{ title: { contains: query } }, { description: { contains: query } }] },
          ],
        } as never,
        limit: 24,
        depth: 1,
      })
    : null

  return (
    <main className="page">
      <h1 className="page__title">Search</h1>
      <form action="/shop/search" method="get" role="search" aria-label="Product search" className="search-form">
        <input
          type="search"
          name="q"
          defaultValue={query ?? ''}
          placeholder="Search products…"
          aria-label="Search products"
          className="input"
        />
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {query === null ? (
        <p className="page__lead">Type a term above — e.g. <em>rtx 4070</em>, <em>mid-tower</em> or <em>mechanical</em>.</p>
      ) : results && results.docs.length === 0 ? (
        <p className="page__lead">No products match “{query}”. Try fewer words or browse the <Link href="/shop">shop</Link>.</p>
      ) : results ? (
        <>
          <p className="result-count">
            {results.totalDocs} result{results.totalDocs === 1 ? '' : 's'} for “{query}”
          </p>
          <ProductCardGrid>
            {results.docs.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </ProductCardGrid>
        </>
      ) : null}
    </main>
  )
}

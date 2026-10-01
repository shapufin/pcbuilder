import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayloadClient, formatPrice } from '@/lib/shop'
import { sanitizeSearchQuery } from '@/lib/search'

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
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Search</h1>
      <form
        action="/shop/search"
        method="get"
        role="search"
        aria-label="Product search"
        style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 520 }}
      >
        <input
          type="search"
          name="q"
          defaultValue={query ?? ''}
          placeholder="Search products…"
          aria-label="Search products"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: 15,
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 22px',
            borderRadius: 10,
            border: 0,
            background: 'var(--color-primary-strong)',
            color: 'var(--color-on-primary)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>

      {query === null ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Type a term above — e.g. <em>rtx 4070</em>, <em>mid-tower</em> or <em>mechanical</em>.</p>
      ) : results && results.docs.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No products match “{query}”. Try fewer words or browse the <Link href="/shop" style={{ color: 'var(--color-primary-hover)' }}>shop</Link>.</p>
      ) : results ? (
        <>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            {results.totalDocs} result{results.totalDocs === 1 ? '' : 's'} for “{query}”
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {results.docs.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
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
                <strong>{p.title}</strong>
                <span style={{ color: 'var(--color-primary-hover)' }}>{formatPrice(p as never)}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </main>
  )
}

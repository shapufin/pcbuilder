import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayloadClient } from '@/lib/shop'

export const metadata: Metadata = { title: 'Page not found | BuildMyRig' }

// 09-routes.md: the 404 offers search + popular categories instead of a dead
// end. The categories fetch is best-effort — a DB outage still renders links.
export default async function NotFound() {
  let categories: { slug: string; title: string }[] = []
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'categories', limit: 6, sort: 'title' })
    categories = res.docs as unknown as { slug: string; title: string }[]
  } catch {
    // fall through — the search/browse links below still work
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Page not found</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
        The page you are looking for does not exist or has moved.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
        <Link href="/shop/search" className="btn btn--primary" style={{ textDecoration: 'none' }}>
          Search products
        </Link>
        <Link href="/shop" className="btn" style={{ textDecoration: 'none' }}>
          Browse the shop
        </Link>
      </div>
      {categories.length > 0 && (
        <nav aria-label="Popular categories" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', textTransform: 'capitalize' }}
            >
              {c.title}
            </Link>
          ))}
        </nav>
      )}
    </main>
  )
}

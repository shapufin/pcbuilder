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
    <main className="status-page">
      <h1 className="status-page__title">Page not found</h1>
      <p className="status-page__desc">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="status-page__actions">
        <Link href="/shop/search" className="btn btn--primary">
          Search products
        </Link>
        <Link href="/shop" className="btn">
          Browse the shop
        </Link>
      </div>
      {categories.length > 0 && (
        <nav aria-label="Popular categories" className="status-page__links">
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}`}>
              {c.title}
            </Link>
          ))}
        </nav>
      )}
    </main>
  )
}

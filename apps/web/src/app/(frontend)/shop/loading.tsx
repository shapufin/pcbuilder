import './shop.css'

/**
 * Shop skeleton — mirrors the category/product grid. Scoped to /shop so the
 * segment-wide `(frontend)/loading.tsx` could be removed: a Suspense boundary
 * above a page turns `notFound()` into a 200 + noindex response (audit
 * 2026-10-22, #667), and a product-grid skeleton was wrong for /about, /faq,
 * /auth/* and /cart anyway.
 */
export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading">
      <span className="skeleton shop-loading-1" />
      <span className="skeleton shop-loading-2" />
      <div className="product-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skeleton shop-loading-3" />
        ))}
      </div>
    </main>
  )
}

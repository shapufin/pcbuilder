import './shop/shop.css'

/** Route-level suspense fallback — generic page skeleton. */
export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading">
      <span className="skeleton" style={{ width: '40%', height: 'var(--text-4xl)', marginBottom: 'var(--space-4)' }} />
      <span className="skeleton" style={{ width: '60%', height: 'var(--text-base)', marginBottom: 'var(--space-8)' }} />
      <div className="product-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skeleton" style={{ aspectRatio: '3 / 4' }} />
        ))}
      </div>
    </main>
  )
}

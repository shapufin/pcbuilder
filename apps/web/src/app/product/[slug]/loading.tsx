import './product.css'

/** PDP skeleton — mirrors the gallery + buy-box layout to avoid CLS. */
export default function Loading() {
  return (
    <main className="pdp" aria-busy="true" aria-label="Loading">
      <span className="skeleton" style={{ width: '30%', height: 'var(--text-sm)', marginBottom: 'var(--space-5)', display: 'block' }} />
      <div className="pdp__layout">
        <section>
          <span className="skeleton" style={{ aspectRatio: '3 / 2', width: '100%', display: 'block' }} />
          <span className="skeleton" style={{ width: '55%', height: 'var(--text-4xl)', margin: 'var(--space-6) 0 var(--space-2)', display: 'block' }} />
          <span className="skeleton" style={{ width: '25%', height: 'var(--text-base)', marginBottom: 'var(--space-4)', display: 'block' }} />
          <span className="skeleton" style={{ width: '100%', height: '120px', display: 'block' }} />
        </section>
        <aside className="buy-box">
          <span className="skeleton" style={{ width: '45%', height: 'var(--text-3xl)' }} />
          <span className="skeleton" style={{ width: '30%', height: 'var(--text-sm)' }} />
          <span className="skeleton" style={{ width: '100%', height: 'var(--tap-target)' }} />
          <span className="skeleton" style={{ width: '100%', height: 'var(--tap-target)' }} />
        </aside>
      </div>
    </main>
  )
}

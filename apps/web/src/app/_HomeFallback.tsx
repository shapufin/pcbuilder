import Link from 'next/link'
import { getPayloadClient, formatPrice } from '@/lib/shop'

/**
 * Legacy Phase-1 homepage — used when no published page has isHomepage=true.
 * (Underscore prefix: excluded from routing.)
 */
export async function HomeFallback() {
  const payload = await getPayloadClient()
  const [categories, products] = await Promise.all([
    payload.find({ collection: 'categories', limit: 20, sort: 'title' }),
    payload.find({ collection: 'products', where: { _status: { equals: 'published' } }, limit: 8, sort: 'createdAt' }),
  ])

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
      <section style={{ textAlign: 'center', marginBottom: 64 }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 12 }}>Build your perfect rig</h1>
        <p style={{ color: '#94a3b8', fontSize: 18, marginBottom: 24 }}>
          Pre-built gaming and creator PCs, or configure your own — step by step.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/builder" style={ctaPrimary}>Open the builder</Link>
          <Link href="/shop" style={ctaSecondary}>Browse components</Link>
        </div>
      </section>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Categories</h2>
      <div style={grid}>
        {categories.docs.map((cat) => (
          <Link key={cat.id} href={`/shop/${cat.slug}`} style={card}>
            <strong>{cat.title}</strong>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '48px 0 16px' }}>Latest products</h2>
      <div style={grid}>
        {products.docs.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} style={card}>
            <strong>{p.title}</strong>
            <span style={{ color: '#818cf8' }}>{formatPrice(p as never)}</span>
          </Link>
        ))}
      </div>
    </main>
  )
}

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 } as const
const card = {
  border: '1px solid #1e293b', borderRadius: 12, padding: 20, color: '#e2e8f0',
  textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, background: '#0f172a',
} as const
const ctaPrimary = {
  padding: '12px 24px', borderRadius: 8, background: '#4f46e5', color: '#fff',
  fontWeight: 600, textDecoration: 'none',
} as const
const ctaSecondary = {
  padding: '12px 24px', borderRadius: 8, background: '#1e293b', color: '#e2e8f0',
  fontWeight: 600, textDecoration: 'none',
} as const

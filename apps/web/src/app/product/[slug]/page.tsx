import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPayloadClient, formatPrice } from '@/lib/shop'
import { JsonLd, productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { AddToCartButton } from './AddToCartButton'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const product = (await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1 })).docs[0]
  return {
    title: product ? `${product.title} | BuildMyRig` : 'Product | BuildMyRig',
    description: product?.description ?? undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const product = (await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1, depth: 2 })).docs[0]
  if (!product) notFound()

  const variants = await payload.find({
    collection: 'variants',
    where: { product: { equals: product.id } },
    limit: 10,
  })
  const specs = (product as { specsJson?: Record<string, unknown> | null }).specsJson

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <nav style={{ color: '#64748b', marginBottom: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
        {product.category && typeof product.category === 'object' && (
          <>
            {' / '}
            <Link href={`/shop/${product.category.slug}`} style={{ color: '#64748b', textDecoration: 'none' }}>
              {product.category.title}
            </Link>
          </>
        )}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40 }}>
        <section>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{product.title}</h1>
          {product.brand && typeof product.brand === 'object' && (
            <p style={{ color: '#94a3b8', marginBottom: 16 }}>{product.brand.name}</p>
          )}
          <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: 32 }}>{product.description}</p>

          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Specifications</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {specs
                ? Object.entries(specs).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 12px', color: '#94a3b8', width: '40%' }}>{k}</td>
                      <td style={{ padding: '8px 12px' }}>{String(v)}</td>
                    </tr>
                  ))
                : (
                    <tr>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>No specs listed.</td>
                    </tr>
                  )}
            </tbody>
          </table>
        </section>

        <aside style={{ border: '1px solid #1e293b', borderRadius: 12, padding: 24, background: '#0f172a', alignSelf: 'start' }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#818cf8', marginBottom: 8 }}>{formatPrice(product as never)}</p>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>VAT included. Shipping calculated at checkout.</p>
          <AddToCartButton
            productId={product.id}
            variantId={variants.docs[0]?.id}
            label={product.title}
          />
          {Boolean((product as { isComponent?: boolean | null }).isComponent) && (
            <Link
              href="/builder"
              style={{
                display: 'block',
                marginTop: 16,
                color: '#818cf8',
                fontSize: 14,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Available in the PC Builder →
            </Link>
          )}
        </aside>
      </div>

      <JsonLd data={productJsonLd(product as never)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          ...(product.category && typeof product.category === 'object'
            ? [{ name: product.category.title, url: `/shop/${product.category.slug}` }]
            : []),
          { name: product.title, url: `/product/${product.slug}` },
        ])}
      />
    </main>
  )
}

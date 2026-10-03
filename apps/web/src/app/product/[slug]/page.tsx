import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPayloadClient, formatPrice } from '@/lib/shop'
import { JsonLd, productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { AddToCartButton } from './AddToCartButton'
import { ViewItemTracker } from './ViewItemTracker'
import { WishlistButton } from '@/components/WishlistButton'

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
  // plugin-ecommerce `inventory: true` adds `inventory` to variants; null =
  // untracked = treat as in stock (don't lie to buyers or schema.org).
  const inStock =
    variants.docs.length === 0 ||
    variants.docs.some((v) => {
      const inv = (v as { inventory?: number | null }).inventory
      return inv == null || inv > 0
    })

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <nav style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
        <Link href="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Home</Link>
        {product.category && typeof product.category === 'object' && (
          <>
            {' / '}
            <Link href={`/shop/${product.category.slug}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              {product.category.title}
            </Link>
          </>
        )}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40 }}>
        <section>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{product.title}</h1>
          {product.brand && typeof product.brand === 'object' && (
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>{product.brand.name}</p>
          )}
          <p style={{ color: 'var(--color-border-strong)', lineHeight: 1.6, marginBottom: 32 }}>{product.description}</p>

          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Specifications</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {specs
                ? Object.entries(specs).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--color-surface)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)', width: '40%' }}>{k}</td>
                      <td style={{ padding: '8px 12px' }}>{String(v)}</td>
                    </tr>
                  ))
                : (
                    <tr>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>No specs listed.</td>
                    </tr>
                  )}
            </tbody>
          </table>
        </section>

        <aside style={{ border: '1px solid var(--color-surface)', borderRadius: 12, padding: 24, background: 'var(--color-bg)', alignSelf: 'start' }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary-hover)', marginBottom: 4 }}>{formatPrice(product as never)}</p>
          <p style={{ color: inStock ? 'var(--color-text-muted)' : 'var(--color-danger)', fontSize: 13, marginBottom: 4 }}>
            {inStock ? 'In stock' : 'Out of stock'}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}>VAT included. Shipping calculated at checkout.</p>
          <AddToCartButton
            productId={product.id}
            variantId={variants.docs[0]?.id}
            label={product.title}
          />
          <WishlistButton
            item={{
              id: String(product.id),
              slug: product.slug,
              title: product.title,
              priceText: formatPrice(product as never),
            }}
          />
          {Boolean((product as { isComponent?: boolean | null }).isComponent) && (
            <Link
              href="/builder"
              style={{
                display: 'block',
                marginTop: 16,
                color: 'var(--color-primary-hover)',
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

      <ViewItemTracker
        item={product.title}
        priceCents={(product as { priceInEUR?: number | null }).priceInEUR ?? undefined}
      />
      <JsonLd data={productJsonLd({ ...product, inStock } as never)} />
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

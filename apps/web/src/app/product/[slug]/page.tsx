import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPayloadClient, formatPrice } from '@/lib/shop'
import { JsonLd, productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { mediaDoc, pickMedia } from '@/lib/media'
import { compatRows, specRows } from '@/lib/specs'
import { ViewItemTracker } from './ViewItemTracker'
import { WishlistButton } from '@/components/WishlistButton'
import { ProductGallery } from './ProductGallery'
import { VariantPicker } from './VariantPicker'
import { ProductCard, ProductCardGrid } from '@/components/ProductCard'
import './product.css'

type Props = {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const product = (
    await payload.find({
      collection: 'products',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
    })
  ).docs[0]
  return {
    title: product ? `${product.title} | BuildMyRig` : 'Product | BuildMyRig',
    description: product?.description ?? undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const product = (
    await payload.find({
      collection: 'products',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 2,
    })
  ).docs[0]
  if (!product) notFound()

  const variants = await payload.find({
    collection: 'variants',
    where: { product: { equals: product.id } },
    limit: 10,
    depth: 1,
  })
  const specs = (product as { specsJson?: Record<string, unknown> | null }).specsJson
  // Depth 2 above populates attributeType/value — the compatibility list
  // renders real catalogue attributes (entry 64).
  const compat = compatRows((product as { attributeValues?: unknown }).attributeValues)
  // plugin-ecommerce `inventory: true` adds `inventory` to variants; null =
  // untracked = treat as in stock (don't lie to buyers or schema.org).
  const inStock =
    variants.docs.length === 0 ||
    variants.docs.some((v) => {
      const inv = (v as { inventory?: number | null }).inventory
      return inv == null || inv > 0
    })

  const gallery = Array.isArray(product.gallery) ? product.gallery : []
  const images = gallery
    .map((m) => pickMedia(mediaDoc(m), 'gallery', product.title))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  const pickerVariants = variants.docs.map((v) => {
    const options = Array.isArray((v as { options?: unknown[] }).options)
      ? ((v as { options: unknown[] }).options
          .map((o) => (typeof o === 'object' && o !== null ? (o as { label?: string }).label : null))
          .filter(Boolean) as string[])
      : []
    return {
      id: v.id,
      label: options.length > 0 ? options.join(' / ') : (v as { title?: string | null }).title || 'Standard',
      priceInEUR: (v as { priceInEUR?: number | null }).priceInEUR,
      inventory: (v as { inventory?: number | null }).inventory,
    }
  })

  // RelatedProducts rail (entry 62): same category, published, never the
  // viewed product. Depth 1 populates brand/gallery for ProductCard.
  const related = (
    product.category && typeof product.category === 'object'
      ? await payload.find({
          collection: 'products',
          where: {
            and: [
              { category: { equals: product.category.id } },
              { id: { not_equals: product.id } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: 4,
          depth: 1,
          sort: 'title',
        })
      : { docs: [] }
  ).docs

  return (
    <main className="pdp">
      <nav className="pdp__breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        {product.category && typeof product.category === 'object' && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/shop/${product.category.slug}`}>{product.category.title}</Link>
          </>
        )}
      </nav>

      <div className="pdp__layout">
        <section>
          <ProductGallery images={images} />
          <h1 className="pdp__title">{product.title}</h1>
          {product.brand && typeof product.brand === 'object' && (
            <p className="pdp__brand">{product.brand.name}</p>
          )}
          <p className="pdp__desc">{product.description}</p>

          <h2 className="pdp__specs-title">Specifications</h2>
          <table className="spec-table">
            <tbody>
              {(() => {
                const rows = specRows(specs)
                return rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.key}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>No specs listed.</td>
                  </tr>
                )
              })()}
            </tbody>
          </table>

          {compat.length > 0 ? (
            <section className="pdp__compat" aria-labelledby="pdp-compat-title">
              <h2 id="pdp-compat-title" className="pdp__compat-title">
                Compatibility
              </h2>
              <ul className="compat-list">
                {compat.map((row) => (
                  <li key={row.name}>
                    <span className="compat-list__key">{row.name}</span>
                    <span className="compat-list__val">{row.value}</span>
                  </li>
                ))}
              </ul>
              <Link href="/builder" className="pdp__compat-link">
                Check compatibility in the PC Builder →
              </Link>
            </section>
          ) : null}
        </section>

        <aside className="buy-box">
          <VariantPicker
            productId={product.id}
            productTitle={product.title}
            fallbackPriceCents={(product as { priceInEUR?: number | null }).priceInEUR ?? 0}
            variants={pickerVariants}
          />
          <p className="buy-box__tax">VAT included. Shipping calculated at checkout.</p>
          <WishlistButton
            item={{
              id: String(product.id),
              slug: product.slug,
              title: product.title,
              priceText: formatPrice(product as never),
            }}
          />
          {Boolean((product as { isComponent?: boolean | null }).isComponent) && (
            <Link href="/builder" className="buy-box__builder-link">
              Available in the PC Builder →
            </Link>
          )}
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="pdp__related" aria-labelledby="pdp-related-title">
          <h2 id="pdp-related-title" className="pdp__related-title">
            Related products
          </h2>
          <ProductCardGrid>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductCardGrid>
        </section>
      ) : null}

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

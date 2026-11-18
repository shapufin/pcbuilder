import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { getPayloadClient, formatPrice } from '@/lib/shop'
import { JsonLd, productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { mediaDoc, pickMedia } from '@/lib/media'
import { compatRows, resolveProductSpecs, specRows, specRowsExcept } from '@/lib/specs'
import { getThemeAssets } from '@/lib/theme.server'
import { NEXUS_META_KEYS, NexusPdpExtras } from '@/themes/nexus/NexusPdpExtras'
import { ViewItemTracker } from './ViewItemTracker'
import { WishlistButton } from '@/components/WishlistButton'
import { ProductGallery } from './ProductGallery'
import { VariantPicker } from './VariantPicker'
import { ProductCard, ProductCardGrid } from '@/components/ProductCard'
import { PageRenderer } from '@/blocks/PageRenderer'
import { ProductReviews, type ReviewItem } from './ProductReviews'
import { getStoreSettings } from '@/lib/store-settings.server'
import { resolveComponentSpecs } from '@/lib/component-specs.server'
import { aggregateRating as averageRating, crossSellIds as crossSellIdsOf, pickerVariants as toPickerVariants, productBadge, reviewItems as toReviewItems, variantsInStock } from '@/lib/pdp'
import './product.css'

type Props = {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export const getProductBySlug = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'products',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
})

export async function generateStaticParams() {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'products',
      where: { _status: { equals: 'published' } },
      limit: 100,
      depth: 0,
    })
    return res.docs.map((doc) => ({ slug: doc.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  return {
    title: product ? `${product.title} | BuildMyRig` : 'Product | BuildMyRig',
    description: product?.description ?? undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const payload = await getPayloadClient()

  const crossSellIds = crossSellIdsOf(product as unknown as Record<string, unknown>)

  // Parallelize independent data fetches to eliminate serial waterfalls
  const variantsPromise = payload.find({
    collection: 'variants',
    where: { product: { equals: product.id } },
    limit: 10,
    depth: 1,
  })

  const themeAssetsPromise = getThemeAssets()
  const storeSettingsPromise = getStoreSettings()

  const relatedPromise = (
    crossSellIds && crossSellIds.length > 0
      ? payload.find({
          collection: 'products',
          where: {
            and: [
              { id: { in: crossSellIds } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: 4,
          depth: 1,
        })
      : product.category && typeof product.category === 'object'
      ? payload.find({
          collection: 'products',
          where: {
            and: [
              { category: { equals: (product.category as { id: number }).id } },
              { id: { not_equals: product.id } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: 4,
          depth: 1,
          sort: 'title',
        })
      : Promise.resolve({ docs: [] })
  )

  const reviewsPromise = payload.find({
    collection: 'reviews',
    where: {
      and: [
        { product: { equals: product.id } },
        { status: { equals: 'approved' } },
      ],
    },
    limit: 50,
    sort: '-createdAt',
  }).catch(() => ({ docs: [] }))

  const [variants, themeAssets, storeSettings, relatedRes, reviewsRes] = await Promise.all([
    variantsPromise,
    themeAssetsPromise,
    storeSettingsPromise,
    relatedPromise,
    reviewsPromise,
  ])
  const related = relatedRes.docs

  // Inherit / fallback specs from linked builder component if available (entry 86).
  // product.component is already populated at depth 2 — the resolver reads it
  // for free instead of re-fetching the product (audit 2026-10-24).
  const componentSpecs = (product as { isComponent?: boolean | null }).isComponent
    ? await resolveComponentSpecs(
        product as { component?: unknown },
        variants.docs.map((v) => v.id),
        payload,
      )
    : null

  const specs = resolveProductSpecs(
    (product as { specsJson?: Record<string, unknown> | null }).specsJson,
    componentSpecs,
  )
  // Depth 2 above populates attributeType/value — the compatibility list
  // renders real catalogue attributes (entry 64).
  const compat = compatRows((product as { attributeValues?: unknown }).attributeValues)
  // plugin-ecommerce `inventory: true` adds `inventory` to variants; null =
  // untracked = treat as in stock (don't lie to buyers or schema.org).
  const inStock = variantsInStock(variants.docs as Array<{ inventory?: number | null }>)

  // Entry 71: pack-aware — Nexus PDP shows the meta chip strip and drops those
  // keys from the spec table. getThemeAssets is React.cache'd (shared w/ layout).
  const isNexus = themeAssets.pack === 'nexus'

  const gallery = Array.isArray(product.gallery) ? product.gallery : []
  const images = gallery
    .map((m) => pickMedia(mediaDoc(m), 'gallery', product.title))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  const pickerVariants = toPickerVariants(variants.docs as unknown as Record<string, unknown>[])

  const reviewsEnabled = storeSettings.features.reviews !== false

  const reviewViews = toReviewItems(reviewsRes.docs as unknown as Record<string, unknown>[], reviewsEnabled)
  const reviewItems: ReviewItem[] = reviewViews
  const aggregateRating = reviewsEnabled ? averageRating(reviewViews) : null
  const badge = productBadge(
    (product as { badgeType?: string }).badgeType,
    (product as { customBadgeText?: string }).customBadgeText,
  )

  const customBlocks = (product as { customBlocks?: unknown[] }).customBlocks

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
          <div className="pdp__meta-tags">
            {badge ? (
              <span className={`pdp__badge pdp__badge--${badge.type}`}>
                {badge.label}
              </span>
            ) : null}
            <span className="pdp__warranty-badge">
              <ShieldCheck size={12} aria-hidden />
              {(() => {
                const tier = (product as { warrantyTier?: string | null }).warrantyTier
                if (tier === 'extended') return '3-Year Armor Warranty'
                if (tier === 'premium') return '5-Year Enterprise Coverage'
                if (tier === 'lifetime') return 'Lifetime Manufacturer Warranty'
                return '2-Year Manufacturer Warranty'
              })()}
            </span>
          </div>
          <h1 className="pdp__title">{product.title}</h1>
          {product.brand && typeof product.brand === 'object' && (
            <p className="pdp__brand">{product.brand.name}</p>
          )}

          {Array.isArray((product as { keyFeatures?: Array<{ feature?: string | null }> }).keyFeatures) &&
            ((product as { keyFeatures?: Array<{ feature?: string | null }> }).keyFeatures?.length ?? 0) > 0 && (
              <div className="pdp__highlights">
                <h3 className="pdp__highlights-title">Key Highlights</h3>
                <ul className="pdp__highlights-list">
                  {(product as { keyFeatures?: Array<{ feature?: string | null }> }).keyFeatures!
                    .filter((item): item is { feature: string } => Boolean(item?.feature))
                    .map((item, idx) => (
                      <li key={idx}>{item.feature}</li>
                    ))}
                </ul>
              </div>
            )}

          <p className="pdp__desc">{product.description}</p>
          {isNexus && <NexusPdpExtras specsJson={specs} />}

          {(() => {
            const rows = isNexus ? specRowsExcept(specs, NEXUS_META_KEYS) : specRows(specs)
            // Nexus meta keys already surfaced above — an empty generic table
            // under a populated extras panel just reads as "No specs listed."
            if (isNexus && rows.length === 0) return null
            return (
              <>
                <h2 className="pdp__specs-title">Specifications</h2>
                <table className="spec-table">
                  <tbody>
                    {rows.length > 0 ? (
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
                    )}
                  </tbody>
                </table>
              </>
            )
          })()}

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
            fallbackPriceCents={(product as { priceInEUR?: number | null }).priceInEUR ?? null}
            compareAtPriceCents={(product as { compareAtPriceInEUR?: number | null }).compareAtPriceInEUR}
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

      {Array.isArray(customBlocks) && customBlocks.length > 0 ? (
        <div className="pdp__custom-blocks">
          <PageRenderer layout={customBlocks as never} />
        </div>
      ) : null}

      {reviewsEnabled && (
        <ProductReviews
          productId={product.id}
          productTitle={product.title}
          reviews={reviewItems}
        />
      )}

      {related.length > 0 ? (
        <section className="pdp__related" aria-labelledby="pdp-related-title">
          <h2 id="pdp-related-title" className="pdp__related-title">
            {(crossSellIds?.length ?? 0) > 0 ? 'Frequently Bought Together' : 'Related products'}
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
      <JsonLd data={productJsonLd({ ...product, inStock, aggregateRating } as never)} />
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

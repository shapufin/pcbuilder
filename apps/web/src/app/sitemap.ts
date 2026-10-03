import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/shop'

export const revalidate = 3600

const base = () => process.env.BMR_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = base()
  const staticEntries: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: 'daily', priority: 1 },
    { url: `${origin}/builder`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/shop`, changeFrequency: 'daily', priority: 0.9 },
  ]
  let products, categories, pages
  try {
    const payload = await getPayloadClient()
    ;[products, categories, pages] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { _status: { equals: 'published' } },
      limit: 1000,
      sort: '-updatedAt',
    }),
    payload.find({ collection: 'categories', limit: 100, sort: 'title' }),
    payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      limit: 200,
      sort: 'title',
    }),
    ])
  } catch {
    // 13-performance-seo.md: degrade to the static routes instead of a 500
    // when the DB is unreachable.
    return staticEntries
  }

  return [
    ...staticEntries,
    ...pages.docs
      .filter((p) => !p.isHomepage)
      .map((p) => ({ url: `${origin}/${p.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...categories.docs.map((c) => ({ url: `${origin}/shop/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...products.docs.map((p) => ({ url: `${origin}/product/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    // No template entries: `/builder?template=<slug>` is a filtered view of
    // /builder, not a distinct indexable page — query-param sitemap URLs are
    // ignored by search engines anyway.
  ]
}

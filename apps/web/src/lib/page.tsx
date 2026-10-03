import type { Metadata } from 'next'
import { getPayloadClient } from '@/lib/shop'

export type PageDoc = {
  id: number | string
  title: string
  slug: string
  isHomepage?: boolean
  layout?: { blockType?: string }[] | null
  seo?: { title?: string | null; description?: string | null; image?: { url?: string | null } | null } | null
}

export async function getPageBySlug(slug: string): Promise<PageDoc | null> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 3,
    })
    return (res.docs[0] as PageDoc | undefined) ?? null
  } catch {
    return null
  }
}

export async function getHomepagePage(): Promise<PageDoc | null> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'pages',
      where: { and: [{ isHomepage: { equals: true } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 3,
    })
    return (res.docs[0] as PageDoc | undefined) ?? null
  } catch {
    return null
  }
}

const siteName = 'BuildMyRig'

export function pageMetadata(page: PageDoc): Metadata {
  const title = page.seo?.title || `${page.title} | ${siteName}`
  return {
    title,
    description: page.seo?.description ?? undefined,
    openGraph: {
      title,
      description: page.seo?.description ?? undefined,
      images: page.seo?.image?.url ? [{ url: page.seo.image.url }] : undefined,
    },
  }
}

import { cache } from 'react'
import { getPayloadClient } from '@/lib/shop'

export type PageDoc = {
  id: number | string
  title: string
  slug: string
  isHomepage?: boolean
  layout?: { blockType?: string }[] | null
  seo?: { title?: string | null; description?: string | null; image?: { url?: string | null } | null } | null
}

export const getPageBySlug = cache(async function getPageBySlug(slug: string): Promise<PageDoc | null> {
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
})

export const getHomepagePage = cache(async function getHomepagePage(): Promise<PageDoc | null> {
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
})

export { H1_BLOCKS, layoutHasH1 } from './page-heading.ts'
export { pageMetadata } from './page-metadata.ts'


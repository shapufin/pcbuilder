import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageRenderer } from '@/blocks/PageRenderer'
import { getPageBySlug, layoutHasH1, pageMetadata } from '@/lib/page'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return { title: 'Not found | BuildMyRig' }
  return pageMetadata(page)
}

export default async function StaticPage({ params }: Props) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()
  return (
    <main>
      {/* Rich-text/CTA-only pages have no hero, so nothing rendered an <h1>. */}
      {layoutHasH1(page.layout) ? null : <h1 className="sr-only">{page.title}</h1>}
      <PageRenderer layout={page.layout} />
    </main>
  )
}

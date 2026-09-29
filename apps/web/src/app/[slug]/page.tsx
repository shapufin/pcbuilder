import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageRenderer } from '@/blocks/PageRenderer'
import { getPageBySlug, pageMetadata } from '@/lib/page'

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
      <PageRenderer layout={page.layout} />
    </main>
  )
}

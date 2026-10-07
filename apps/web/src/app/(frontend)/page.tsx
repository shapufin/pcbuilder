import type { Metadata } from 'next'
import { PageRenderer } from '@/blocks/PageRenderer'
import { getHomepagePage, pageMetadata } from '@/lib/page'
import { HomeFallback } from './_HomeFallback'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const page = await getHomepagePage()
  if (page) return pageMetadata(page)
  return {
    title: 'BuildMyRig — custom PCs, configured your way',
    description: 'Pre-built gaming and creator PCs, or configure your own — step by step.',
  }
}

export default async function Home() {
  const page = await getHomepagePage()
  if (page) {
    return (
      <main>
        <PageRenderer layout={page.layout} />
      </main>
    )
  }
  return <HomeFallback />
}

import type { Metadata } from 'next'
import type { PageDoc } from './page'

const siteName = 'BuildMyRig'

/** Pure (no Payload import) so it is unit-testable — audit 2026-11-18 L6. */
export function pageMetadata(page: PageDoc): Metadata {
  // Audit 2026-11-18 L6: editor SEO titles carry the brand suffix too (once).
  const base = page.seo?.title?.trim() || page.title
  const title = base.includes(siteName) ? base : `${base} | ${siteName}`
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

import { getPayloadClient } from '@/lib/shop'
import { TemplatesCarouselClient } from './TemplatesCarouselClient'

type TemplateDoc = {
  id: string | number
  name: string
  slug: string
  description?: string | null
  tags?: string[] | null
  basePrice?: number | null
  popularity?: number | null
  images?: { url?: string | null }[] | null
  slots?: {
    category?: { id: string | number } | string | number | null
    component?: { id: string | number } | string | number | null
  }[] | null
}

const idOf = (v: unknown): string | null => {
  if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id)
  if (v === null || v === undefined) return null
  return String(v)
}

export async function TemplatesCarousel({
  block,
}: {
  block: { heading?: string | null; tagFilter?: string | null; autoplay?: boolean | null }
}) {
  const payload = await getPayloadClient()
  const templates = await payload.find({
    collection: 'build-templates',
    where: { _status: { equals: 'published' } },
    limit: 12,
    sort: '-popularity',
    depth: 2,
  })

  const items = (templates.docs as TemplateDoc[])
    .map((t) => {
      const slots = (t.slots ?? [])
        .map((s) => ({
          categoryId: idOf(s.category),
          componentId: idOf(s.component),
        }))
        .filter((s): s is { categoryId: string; componentId: string } => Boolean(s.categoryId && s.componentId))
      return {
        id: String(t.id),
        name: t.name,
        slug: t.slug,
        description: t.description ?? null,
        tags: t.tags ?? [],
        basePriceCents: t.basePrice ?? 0,
        image: t.images?.find((img) => img?.url)?.url ?? null,
        slots,
      }
    })
    .filter((t) => {
      const tag = block.tagFilter?.trim().toLowerCase()
      if (!tag) return true
      return t.tags.includes(tag)
    })

  if (items.length === 0) return null

  return (
    <section className="tpl-carousel">
      <TemplatesCarouselClient heading={block.heading ?? 'Ready-to-go builds'} templates={items} autoplay={Boolean(block.autoplay)} />
    </section>
  )
}

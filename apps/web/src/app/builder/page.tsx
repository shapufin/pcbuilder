import type { Metadata } from 'next'
import { getPayloadClient } from '@/lib/shop'
import { LandingClient } from './LandingClient'
import './builder.css'

export const metadata: Metadata = {
  title: 'PC Builder — configure your own rig | BuildMyRig',
  description: 'Step-by-step PC configurator with live compatibility checks, or start from a proven build template.',
}

export const revalidate = 60

type TemplateDoc = {
  id: string | number
  name: string
  slug: string
  description?: string | null
  tags?: string[] | null
  basePrice?: number | null
  images?: { url?: string | null }[] | null
  slots?: { category?: { id: string | number; name?: string } | string | number; component?: { id: string | number; name?: string } | string | number }[] | null
}

export default async function BuilderLandingPage() {
  const payload = await getPayloadClient()
  const templates = await payload.find({
    collection: 'build-templates',
    where: { _status: { equals: 'published' } },
    limit: 12,
    sort: '-popularity',
    depth: 2,
  })

  return <LandingClient templates={(templates.docs as TemplateDoc[]).map(normalize)} />
}

const normalize = (t: TemplateDoc) => {
  const id = (v: unknown): string | null => {
    if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id)
    if (v === null || v === undefined) return null
    return String(v)
  }
  const name = (v: unknown): string | null => {
    if (v && typeof v === 'object' && 'name' in v) return String((v as { name: unknown }).name)
    return null
  }
  return {
    id: String(t.id),
    name: t.name,
    slug: t.slug,
    description: t.description ?? null,
    tags: t.tags ?? [],
    basePriceCents: t.basePrice ?? 0,
    image: t.images?.find((img) => img?.url)?.url ?? null,
    slots: (t.slots ?? [])
      .map((slot) => ({
        categoryId: id(slot.category),
        categoryName: name(slot.category),
        componentId: id(slot.component),
        componentName: name(slot.component),
      }))
      .filter((slot) => slot.categoryId && slot.componentId) as {
      categoryId: string
      categoryName: string | null
      componentId: string
      componentName: string | null
    }[],
  }
}

export type LandingTemplate = ReturnType<typeof normalize>

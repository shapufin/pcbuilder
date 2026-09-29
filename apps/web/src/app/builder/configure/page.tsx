import { Configurator } from './Configurator'
import '../builder.css'

export const metadata = { title: 'Configure your build | BuildMyRig' }

type TemplateSlotDoc = {
  category?: { id: string | number } | string | number | null
  component?: { id: string | number } | string | number | null
}

export type ConfigureTemplate = {
  id: string
  name: string
  slots: { categoryId: string; componentId: string }[]
}

const idOf = (v: unknown): string | null => {
  if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id)
  if (v === null || v === undefined) return null
  return String(v)
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ConfiguratorPage({ searchParams }: Props) {
  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const templateId = first(sp.template)
  const sharedBuildId = first(sp.build)

  let template: ConfigureTemplate | null = null
  if (templateId) {
    const { getPayloadClient } = await import('@/lib/shop')
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'build-templates',
      where: { id: { equals: templateId } },
      limit: 1,
      depth: 2,
    })
    const doc = res.docs[0] as
      | { id: string | number; name: string; slots?: TemplateSlotDoc[] | null }
      | undefined
    if (doc) {
      template = {
        id: String(doc.id),
        name: doc.name,
        slots: (doc.slots ?? [])
          .map((s) => ({ categoryId: idOf(s.category), componentId: idOf(s.component) }))
          .filter((s): s is { categoryId: string; componentId: string } => Boolean(s.categoryId && s.componentId)),
      }
    }
  } else if (sharedBuildId) {
    // Public share link → hydrate the draft from the shared build (read via shareId,
    // which is the public capability — no owner check needed).
    const { getPayloadClient } = await import('@/lib/shop')
    const payload = await getPayloadClient()
    const doc = (await payload.findByID({
      collection: 'configured-builds',
      id: sharedBuildId,
      overrideAccess: true,
      depth: 1,
    })) as
      | { id: string | number; name: string; shareId?: string; slots?: TemplateSlotDoc[] | null }
      | null
    if (doc) {
      template = {
        id: `shared:${doc.shareId ?? sharedBuildId}`,
        name: doc.name,
        slots: (doc.slots ?? [])
          .map((s) => ({ categoryId: idOf(s.category), componentId: idOf(s.component) }))
          .filter((s): s is { categoryId: string; componentId: string } => Boolean(s.categoryId && s.componentId)),
      }
    }
  }

  return <Configurator template={template} />
}

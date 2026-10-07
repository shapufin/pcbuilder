import { getPayloadClient } from '@/lib/shop'
import { getBuilderDesign } from '@/lib/builder-settings.server'
import { BuilderShell } from './BuilderShell'
import '../builder.css'

export const metadata = { title: 'Configure your build | BuildMyRig' }

type TemplateSlotDoc = {
  category?: { id: string | number } | string | number | null
  component?: { id: string | number } | string | number | null
}

type BuildSlotDoc = {
  category?: { id: string | number } | string | number | null
  components?: ({ id: string | number } | string | number)[] | null
}

export type ConfigureTemplate = {
  id: string
  name: string
  slots: { categoryId: string; componentId: string }[]
  rgbColor?: string
}

const idOf = (v: unknown): string | null => {
  if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id)
  if (v === null || v === undefined) return null
  return String(v)
}

const normalizeTemplateDoc = (doc: {
  id: string | number
  name: string
  slots?: TemplateSlotDoc[] | null
}): ConfigureTemplate => ({
  id: String(doc.id),
  name: doc.name,
  slots: (doc.slots ?? [])
    .map((s) => ({ categoryId: idOf(s.category), componentId: idOf(s.component) }))
    .filter((s): s is { categoryId: string; componentId: string } => Boolean(s.categoryId && s.componentId)),
})

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ConfiguratorPage({ searchParams }: Props) {
  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const templateId = first(sp.template)
  const sharedBuildId = first(sp.build)
  const pathParam = first(sp.path)
  const path = pathParam === 'amd' || pathParam === 'intel' ? pathParam : null

  const payload = await getPayloadClient()

  let template: ConfigureTemplate | null = null
  if (templateId) {
    const res = await payload.find({
      collection: 'build-templates',
      where: {
        and: [{ id: { equals: templateId } }, { _status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 2,
    })
    const doc = res.docs[0] as
      | { id: string | number; name: string; slots?: TemplateSlotDoc[] | null }
      | undefined
    if (doc) template = normalizeTemplateDoc(doc)
  } else if (sharedBuildId) {
    // Public share link → hydrate the draft from the shared build. The value is
    // the build's shareId (unguessable capability), NOT the numeric id — a raw
    // findByID here would let anyone enumerate every saved build.
    const doc = (
      await payload.find({
        collection: 'configured-builds',
        where: { shareId: { equals: sharedBuildId } },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      })
    ).docs[0] as
      | { id: string | number; name: string; shareId?: string; rgbColor?: string | null; slots?: BuildSlotDoc[] | null }
      | undefined
    if (doc) {
      // configured-builds store `components[]` (hasMany), not the singular
      // `component` of build-templates — expand one row per component so
      // multi-select slots hydrate correctly. rgbColor torna nel draft:
      // il link condiviso ricrea anche l'accento scelto dall'autore.
      template = {
        id: `shared:${doc.shareId ?? sharedBuildId}`,
        name: doc.name,
        slots: (doc.slots ?? [])
          .flatMap((s) =>
            (s.components ?? []).map((c) => ({ categoryId: idOf(s.category), componentId: idOf(c) })),
          )
          .filter((s): s is { categoryId: string; componentId: string } => Boolean(s.categoryId && s.componentId)),
        ...(doc.rgbColor ? { rgbColor: doc.rgbColor } : {}),
      }
    }
  }

  // Preset per il SavedBuildsModal dei design (Architect Presets) — una
  // find per request, come la landing (depth 2 espande category/component).
  const templateDocs = await payload.find({
    collection: 'build-templates',
    where: { _status: { equals: 'published' } },
    limit: 20,
    sort: '-popularity',
    depth: 2,
  })
  const templates = (templateDocs.docs as { id: string | number; name: string; slots?: TemplateSlotDoc[] | null }[])
    .map(normalizeTemplateDoc)

  const design = await getBuilderDesign()

  return <BuilderShell design={design} template={template} templates={templates} path={path} />
}

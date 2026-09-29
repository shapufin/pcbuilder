import type { Access, CollectionConfig, Config, Field } from 'payload'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { pageBlocks, HeroBlock, CtaBannerBlock } from '../blocks/definitions.ts'

const isStaff: Access = ({ req }) =>
  Boolean(req.user?.roles?.some((r) => ['admin', 'manager', 'staff'].includes(r)))
const isManager: Access = ({ req }) =>
  Boolean(req.user?.roles?.some((r) => ['admin', 'manager'].includes(r)))

/**
 * Block-composed pages (docs/buildmyrig-plan/04-collections/platform.md + 10-blocks-pages.md).
 * Exactly one page has isHomepage=true — enforced by hook (a unique checkbox
 * would also constrain multiple `false` rows).
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: { drafts: true },
  access: {
    read: ({ req }) => {
      if (isStaff({ req })) return true
      return { _status: { equals: 'published' } }
    },
    create: isManager,
    update: isManager,
    delete: isManager,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        if (data?.isHomepage === true) {
          const keepId = originalDoc?.id
          await req.payload.update({
            collection: 'pages',
            where: {
              and: [
                { isHomepage: { equals: true } },
                ...(keepId ? [{ id: { not_equals: keepId } }] : []),
              ],
            },
            data: { isHomepage: false } as never,
            overrideAccess: true,
            req,
          })
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        // On-demand revalidation (13-performance-seo.md): homepage renders `/`,
        // other pages render at `/<slug>` via the root [slug] route.
        try {
          const { revalidatePath } = await import('next/cache')
          if (doc.isHomepage) revalidatePath('/')
          if (doc.slug) revalidatePath(`/${doc.slug}`)
        } catch (e) {
          req.payload.logger.warn(`[pages] revalidate skipped: ${String(e)}`)
        }
        return doc
      },
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'isHomepage', '_status', 'updatedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'isHomepage',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Exactly one page renders / (enforced server-side)' },
    },
    { name: 'layout', type: 'blocks', blocks: pageBlocks, admin: { initCollapsed: true } },
  ],
}

/**
 * SEO fields (04-collections/platform.md): plugin-seo provides
 * `seo.title/description/image/keywords` + admin autogenerate.
 *
 * The plugin hardcodes its group name as `meta` (its `fields` override only
 * controls the inner fields), so the wrapper renames the group to the plan's
 * `seo` after the plugin runs.
 */
/**
 * Bounded top block zone on category pages (10-blocks-pages.md: Hero +
 * CtaBanner only — hardcoded listing template below).
 */
export const categoryTopBlocksPlugin = () => (config: Config): Config => {
  const topBlocks: Field = {
    name: 'topBlocks',
    type: 'blocks',
    blocks: [HeroBlock, CtaBannerBlock],
    admin: { initCollapsed: true },
  }
  return {
    ...config,
    collections: config.collections?.map((collection) =>
      collection && typeof collection === 'object' && 'slug' in collection && collection.slug === 'categories'
        ? { ...collection, fields: [...(collection.fields ?? []), topBlocks] }
        : collection,
    ),
  }
}

export const seoFieldsPlugin = () => {
  const plugin = seoPlugin({
    collections: ['pages'],
    uploadsCollection: 'media',
    generateURL: ({ doc }) => `${process.env.BMR_URL || 'http://localhost:3000'}/${doc?.slug ?? ''}`,
  })
  return (config: Config): Config => {
    const out = plugin(config)
    return {
      ...out,
      collections: out.collections?.map((collection) =>
        collection && typeof collection === 'object' && 'slug' in collection && collection.slug === 'pages'
          ? {
              ...collection,
              fields: (collection.fields ?? []).map((field) =>
                'name' in field && field.name === 'meta' ? { ...field, name: 'seo' } : field,
              ),
            }
          : collection,
      ),
    }
  }
}

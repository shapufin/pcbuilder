import type { Access, CollectionConfig } from 'payload'
import { pageBlockSlugs } from '@buildmyrig/plugin-pages'
import { shouldRevalidatePage } from '@/lib/page-revalidate.ts'

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
  // Plan 4.1 — a layout is the longest form in the admin (28 block types), so
  // an autosave interval is the difference between a lost tab costing one
  // block and costing the whole page. Draft-only saves do not revalidate (see
  // `shouldRevalidatePage`), so this does not become a cache-busting storm.
  versions: { drafts: { autosave: { interval: 800 } } },
  // Plan 4.2 — a deleted page takes its whole block layout with it.
  trash: true,
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
      async ({ doc, previousDoc, req }) => {
        // On-demand revalidation (13-performance-seo.md): homepage renders `/`,
        // other pages render at `/<slug>` via the root [slug] route.
        //
        // Autosave fires this hook every ~800ms with a draft, which the public
        // page never renders — revalidating there would discard the cached
        // page on every keystroke. Only saves that change what is published
        // (publish, edit-while-published, unpublish) bust the cache.
        if (!shouldRevalidatePage({ doc, previousDoc })) return doc
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
    listSearchableFields: ['title', 'slug'],
    group: 'Content',
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'title', type: 'text', required: true, admin: { width: '60%' } },
        { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { width: '40%' } },
      ],
    },
    {
      name: 'isHomepage',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Exactly one page renders / (enforced server-side)' },
    },
    // Block system v2 (entry 22, +contactForm entry 23): the 14 block configs
    // live in config.blocks (pagesPlugin); this field only lists references —
    // pageBlockSlugs is string[] at the package boundary, cast here where
    // BlockSlug is the generated union. filterOptions mirrors section/topBlocks:
    // without it any blockType in config.blocks would validate (review F2).
    {
      name: 'layout',
      type: 'blocks',
      labels: {
        singular: 'Block',
        plural: 'Blocks',
      },
      blocks: [],
      blockReferences: pageBlockSlugs as never,
      filterOptions: () => pageBlockSlugs as never,
      admin: { initCollapsed: true },
    },
  ],
}

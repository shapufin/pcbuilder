import type { CollectionConfig } from 'payload'
import { slotComponentIds, templateBasePrice, type PricedComponent } from '../lib/template-price.ts'

/** ISR pages that render build templates (both revalidate = 60). */
const revalidateTemplatePages = async (): Promise<void> => {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/builder')
    revalidatePath('/')
  } catch {
    /* next/cache unavailable outside the Next server (e.g. unit tests) */
  }
}

export const BuildTemplates: CollectionConfig = {
  slug: 'build-templates',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  versions: { drafts: true },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'tags', 'basePrice', '_status'] },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        try {
          const ids = slotComponentIds(data?.slots)
          if (ids.length === 0) {
            data.basePrice = 0
          } else {
            const comps = await req.payload.find({
              collection: 'components',
              where: { id: { in: ids } },
              depth: 1,
              limit: ids.length,
              overrideAccess: true,
            })
            data.basePrice = templateBasePrice(ids, comps.docs as PricedComponent[])
          }
        } catch (err) {
          req.payload.logger.error(`build-templates: failed to compute basePrice: ${String(err)}`)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc }) => {
        await revalidateTemplatePages()
        return doc
      },
    ],
    afterDelete: [
      async () => {
        await revalidateTemplatePages()
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { position: 'sidebar' } },
    { name: 'description', type: 'textarea' },
    { name: 'heroCopy', type: 'richText' },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true },
    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      options: ['gaming', 'editing', 'workstation', 'streaming'],
    },
    {
      name: 'slots',
      type: 'array',
      fields: [
        { name: 'category', type: 'relationship', relationTo: 'component-categories', required: true },
        { name: 'component', type: 'relationship', relationTo: 'components' },
      ],
    },
    { name: 'basePrice', type: 'number', admin: { readOnly: true, description: 'Computed from slots server-side' } },
    { name: 'popularity', type: 'number', defaultValue: 0, admin: { readOnly: true } },
  ],
}

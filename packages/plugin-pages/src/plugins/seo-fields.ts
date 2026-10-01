import type { Config } from 'payload'
import { seoPlugin } from '@payloadcms/plugin-seo'

/**
 * SEO fields (04-collections/platform.md): plugin-seo provides
 * `seo.title/description/image/keywords` + admin autogenerate for pages.
 *
 * The plugin hardcodes its group name as `meta` (its `fields` override only
 * controls the inner fields), so the wrapper renames the group to the plan's
 * `seo` after the plugin runs. Moved from apps/web/src/collections/Pages.ts
 * in entry 19 (Step B).
 */
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

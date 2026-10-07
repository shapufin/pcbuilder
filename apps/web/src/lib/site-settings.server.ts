import { cache } from 'react'
import { getPayloadClient } from './shop'
import { DEFAULT_SITE_SETTINGS, resolveSiteSettings, type SiteSettings } from '@buildmyrig/plugin-pages'

/**
 * Server-side reader for the `site-settings` global (entry 18, Step A).
 * Never throws: the root layout/footer run at build time for ISR routes, so
 * a missing/unavailable DB must not break rendering — defaults cover it.
 */
export const getSiteSettings = cache(async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'site-settings' })
    return resolveSiteSettings(doc)
  } catch (err) {
    console.error('[site-settings] falling back to defaults:', err)
    return DEFAULT_SITE_SETTINGS
  }
})

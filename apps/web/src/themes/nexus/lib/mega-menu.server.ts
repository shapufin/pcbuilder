import { cache } from 'react'
import { getPayloadClient } from '@/lib/shop'
import { DEFAULT_MEGA_MENU, resolveMegaMenu, type MegaMenu } from '@buildmyrig/plugin-pages'

/**
 * Server-side reader for the `mega-menu` global (entry 71). Never throws:
 * the Nexus header renders at build/ISR time, so a missing global falls back
 * to DEFAULT_MEGA_MENU — same contract as getSiteSettings/getThemeAssets.
 */
export const getMegaMenu = cache(async function getMegaMenu(): Promise<MegaMenu> {
  try {
    const payload = await getPayloadClient()
    // depth 1 so featuredPromo.image resolves to a media doc (url extraction).
    const doc = await payload.findGlobal({ slug: 'mega-menu', depth: 1 })
    return resolveMegaMenu(doc)
  } catch (err) {
    console.error('[mega-menu] falling back to defaults:', err)
    return DEFAULT_MEGA_MENU
  }
})

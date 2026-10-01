import { getPayloadClient } from './shop'
import { DEFAULT_THEME, buildThemeCss, resolveTheme } from '@buildmyrig/plugin-pages'

/**
 * Server-side reader for the `theme` global (entry 21, Step C). Never
 * throws: the root layout renders at build time for ISR routes, so a
 * missing/unavailable DB must not break the page — default theme covers it.
 */
export async function getThemeCss(): Promise<string> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'theme' })
    return buildThemeCss(resolveTheme(doc))
  } catch (err) {
    console.error('[theme] falling back to default theme:', err)
    return buildThemeCss(DEFAULT_THEME)
  }
}

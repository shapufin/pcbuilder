import { getPayloadClient } from './shop'
import {
  DEFAULT_BUILDER_DESIGN,
  resolveBuilderDesign,
  type BuilderDesign,
} from '@buildmyrig/plugin-pc-builder'

/**
 * Server-side reader for the plugin-owned `builder-settings` global (entry 50).
 * Never throws: /builder/configure renders must survive a missing/unavailable
 * DB — the default design covers it, same contract as getSiteSettings.
 */
export async function getBuilderDesign(): Promise<BuilderDesign> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'builder-settings' })
    return resolveBuilderDesign(doc)
  } catch (err) {
    console.error('[builder-settings] falling back to default design:', err)
    return DEFAULT_BUILDER_DESIGN
  }
}

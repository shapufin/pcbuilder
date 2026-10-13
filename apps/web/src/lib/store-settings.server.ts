import { cache } from 'react'
import { getPayloadClient } from './shop'
import {
  DEFAULT_STORE_SETTINGS,
  resolveStoreSettings,
  type StoreSettingsType,
} from '@buildmyrig/plugin-shop'

/**
 * Server-side reader for the `store-settings` global.
 * Never throws: root layout and cart run under ISR/build-time, so defaults apply if DB is down.
 */
export const getStoreSettings = cache(async function getStoreSettings(): Promise<StoreSettingsType> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'store-settings' as never })
    return resolveStoreSettings(doc)
  } catch (err) {
    console.error('[store-settings] falling back to defaults:', err)
    return DEFAULT_STORE_SETTINGS
  }
})

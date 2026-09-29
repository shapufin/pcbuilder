/**
 * One-off backfill for DBs seeded before the products↔builder linkage existed:
 *   pnpm --filter @buildmyrig/web backfill:links
 * (Fresh seeds run the same sync through the components afterChange hooks.)
 */
const { getPayload } = await import('payload')
const config = await (await import('./payload.config.ts')).default
const payload = await getPayload({ config })

const { syncAllProductLinks } = await import('@buildmyrig/plugin-pc-builder')
const count = await syncAllProductLinks(payload)
payload.logger.info(`backfill-product-links: synced ${count} component(s).`)

export {}

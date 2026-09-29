/**
 * Idempotent pages seeder for an already-seeded DB:
 *   pnpm --filter @buildmyrig/web seed:pages
 * (The main `pnpm --filter @buildmyrig/web seed` also creates pages on a fresh DB.)
 */
const { getPayload } = await import('payload')
const config = await (await import('./payload.config.ts')).default
const payload = await getPayload({ config })

const { seedPages } = await import('./pages-seed.ts')
const created = await seedPages(payload)
payload.logger.info(created > 0 ? `seed-pages: created ${created} page(s).` : 'seed-pages: all pages already exist.')

export {}

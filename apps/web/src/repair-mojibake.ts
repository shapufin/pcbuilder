/**
 * One-off repair for content that a CP1252 round-trip mangled (a three-byte
 * sequence where an em dash, euro sign or curly quote belongs). Walks every
 * page's layout and rewrites only the fields that actually changed —
 * idempotent, safe to re-run.
 *
 *   pnpm --filter @buildmyrig/web repair:mojibake
 *
 * Audit 2026-10-22, item 677.
 */
const { getPayload } = await import('payload')
const config = await (await import('./payload.config.ts')).default
const payload = await getPayload({ config })

const { hasMojibake, repairMojibake } = await import('./lib/mojibake.ts')

const pages = await payload.find({ collection: 'pages', limit: 500, depth: 0, overrideAccess: true })

let repaired = 0
for (const page of pages.docs) {
  if (!hasMojibake(page.layout)) continue
  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { layout: repairMojibake(page.layout) } as never,
    overrideAccess: true,
  })
  repaired += 1
  payload.logger.info(`repair-mojibake: rewrote page "${String((page as { slug?: string }).slug)}"`)
}

payload.logger.info(
  repaired > 0 ? `repair-mojibake: repaired ${repaired} page(s).` : 'repair-mojibake: nothing to repair.',
)

export {}

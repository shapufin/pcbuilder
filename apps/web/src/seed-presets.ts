/**
 * Starter Query Presets (plan task 2.2).
 *
 * Payload's preset collection stores user-defined views; these two are the ones
 * the team rebuilds by hand most often. Idempotent: a preset whose title already
 * exists for that collection is left alone.
 *
 *   pnpm --filter @buildmyrig/web seed:presets
 */
const { getPayload } = await import('payload')
const config = await (await import('./payload.config.ts')).default
const payload = await getPayload({ config })

const PRESETS = [
  {
    title: 'Low stock (<5)',
    relatedCollection: 'products',
    where: { and: [{ inventory: { less_than: 5 } }, { _status: { equals: 'published' } }] },
  },
  {
    title: 'Needs fulfilment',
    relatedCollection: 'orders',
    where: { and: [{ status: { in: ['pending', 'processing'] } }] },
  },
] as const

const existing = await payload.find({
  collection: 'payload-query-presets' as never,
  limit: 200,
  depth: 0,
  overrideAccess: true,
})

const have = new Set(
  existing.docs.map(
    (d) => `${String((d as { relatedCollection?: unknown }).relatedCollection)}::${String((d as { title?: unknown }).title)}`,
  ),
)

let created = 0
for (const preset of PRESETS) {
  if (have.has(`${preset.relatedCollection}::${preset.title}`)) continue
  await payload.create({
    collection: 'payload-query-presets' as never,
    data: {
      title: preset.title,
      relatedCollection: preset.relatedCollection,
      isShared: true,
      // Without an explicit constraint Payload defaults to `onlyMe` with an
      // empty user list when the doc is created through the local API — the
      // preset then exists but is readable by nobody (menu shows "No Results").
      access: { read: { constraint: 'everyone' } },
      where: preset.where,
    } as never,
    overrideAccess: true,
  })
  created += 1
  payload.logger.info(`seed-presets: created "${preset.title}" for ${preset.relatedCollection}`)
}

payload.logger.info(
  created > 0 ? `seed-presets: created ${created} preset(s).` : 'seed-presets: all presets already exist.',
)

export {}

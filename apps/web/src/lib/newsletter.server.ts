import { getPayloadClient } from '@/lib/shop'
import type { NewsletterDeps, SubscriberRow } from './newsletter'

const COLLECTION = 'newsletter-subscribers' as const

/** Payload-backed persistence for the newsletter flow (audit 2026-11-18 M3). */
export const newsletterDeps = async (
  extra: Pick<NewsletterDeps, 'newToken' | 'sendEmail'>,
): Promise<NewsletterDeps> => {
  const payload = await getPayloadClient()
  const findOne = async (where: Record<string, unknown>): Promise<(SubscriberRow & { id: number | string }) | null> => {
    const res = await payload.find({
      collection: COLLECTION,
      where: where as never,
      limit: 1,
      depth: 0,
      overrideAccess: true,
      // confirmToken is read-denied at field level; the flow needs it server-side.
      showHiddenFields: true,
    })
    return (res.docs[0] as unknown as (SubscriberRow & { id: number | string }) | undefined) ?? null
  }
  return {
    ...extra,
    now: () => new Date(),
    baseUrl: (process.env.BMR_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
    findByEmail: (email) => findOne({ email: { equals: email } }),
    findByToken: (token) => findOne({ confirmToken: { equals: token } }),
    save: async (row) => {
      const existing = await findOne({ email: { equals: row.email } })
      if (existing) {
        await payload.update({ collection: COLLECTION, id: existing.id, data: row as never, overrideAccess: true })
      } else {
        await payload.create({ collection: COLLECTION, data: row as never, overrideAccess: true })
      }
    },
  }
}

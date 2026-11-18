import { describe, expect, it, vi } from 'vitest'
import { confirmNewsletter, subscribeToNewsletter, type NewsletterDeps, type SubscriberRow } from './newsletter.ts'

/**
 * Audit 2026-11-18 M3: the newsletter used to mail any address on every POST
 * and stored nothing. Now: subscribers persist, double opt-in, and at most one
 * confirmation mail per address per cooldown — so the form can't be used to
 * mail-bomb a stranger, and staff can actually see who signed up.
 */
const makeDeps = (rows: SubscriberRow[] = [], now = new Date('2026-11-18T10:00:00Z')) => {
  const store = [...rows]
  const sent: { to: string; html: string; subject: string }[] = []
  const deps: NewsletterDeps = {
    now: () => now,
    newToken: () => `tok-${store.length + 1}`,
    baseUrl: 'https://shop.test',
    findByEmail: async (email) => store.find((r) => r.email === email) ?? null,
    findByToken: async (token) => store.find((r) => r.confirmToken === token) ?? null,
    save: async (row) => {
      const i = store.findIndex((r) => r.email === row.email)
      if (i >= 0) store[i] = { ...store[i], ...row }
      else store.push({ ...row })
    },
    sendEmail: vi.fn(async (args) => {
      sent.push(args)
      return { sent: true }
    }),
  }
  return { deps, store, sent }
}

describe('newsletter double opt-in (audit 2026-11-18 M3)', () => {
  it('#742 new address is stored pending and gets one confirmation link', async () => {
    const { deps, store, sent } = makeDeps()
    const res = await subscribeToNewsletter(deps, 'New@Example.com ')
    expect(res).toEqual({ ok: true, emailed: true })
    expect(store).toHaveLength(1)
    expect(store[0]).toMatchObject({ email: 'new@example.com', status: 'pending', confirmToken: 'tok-1' })
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('new@example.com')
    expect(sent[0]!.html).toContain('https://shop.test/api/newsletter/confirm?token=tok-1')
  })

  it('#743 repeat submits inside the cooldown send nothing (no mail-bombing)', async () => {
    const { deps, sent } = makeDeps([
      { email: 'v@example.com', status: 'pending', confirmToken: 't', lastSentAt: '2026-11-18T09:55:00Z' },
    ])
    for (let i = 0; i < 5; i++) expect(await subscribeToNewsletter(deps, 'v@example.com')).toEqual({ ok: true, emailed: false })
    expect(sent).toHaveLength(0)
  })

  it('#744 pending past the cooldown gets a fresh link; confirmed never gets mail', async () => {
    const stale = makeDeps([
      { email: 'v@example.com', status: 'pending', confirmToken: 'old', lastSentAt: '2026-11-18T08:00:00Z' },
    ])
    expect(await subscribeToNewsletter(stale.deps, 'v@example.com')).toEqual({ ok: true, emailed: true })
    expect(stale.store[0]!.confirmToken).not.toBe('old')

    const done = makeDeps([{ email: 'c@example.com', status: 'confirmed', confirmToken: null, lastSentAt: null }])
    expect(await subscribeToNewsletter(done.deps, 'c@example.com')).toEqual({ ok: true, emailed: false })
    expect(done.sent).toHaveLength(0)
  })

  it('#745 confirm flips pending → confirmed once, burns the token, rejects unknown tokens', async () => {
    const { deps, store } = makeDeps([
      { email: 'v@example.com', status: 'pending', confirmToken: 'abc', lastSentAt: '2026-11-18T09:00:00Z' },
    ])
    expect(await confirmNewsletter(deps, 'abc')).toBe('confirmed')
    expect(store[0]).toMatchObject({ status: 'confirmed', confirmToken: null })
    expect(await confirmNewsletter(deps, 'abc')).toBe('invalid')
    expect(await confirmNewsletter(deps, '')).toBe('invalid')
  })
})

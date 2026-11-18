import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@buildmyrig/lib'
import { sendResendEmail } from '@buildmyrig/lib/server'
import { clientIp, defaultAllowedOrigins, isAllowedOrigin } from '@/lib/auth'
import { subscribeToNewsletter } from '@/lib/newsletter'
import { newsletterDeps } from '@/lib/newsletter.server'

const limiter = rateLimit({ windowMs: 60_000, max: 5 })

const bodySchema = z.object({ email: z.string().trim().email().max(320) })

const logger = {
  info: (message: string) => console.info(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
}

/**
 * POST /api/newsletter — double opt-in signup (audit 2026-11-18 M3). Stores a
 * pending subscriber and mails a confirmation link to that address only, at
 * most once per cooldown. The answer is identical whether the address is new,
 * pending or already confirmed (no subscription-status oracle).
 */
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req.headers.get('origin'), defaultAllowedOrigins())) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }
  const rl = limiter.check(clientIp(req.headers))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'retry-after': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  try {
    const deps = await newsletterDeps({
      newToken: () => randomBytes(24).toString('base64url'),
      sendEmail: (args) => sendResendEmail(args, logger),
    })
    const result = await subscribeToNewsletter(deps, parsed.data.email)
    return NextResponse.json(result.dryRun ? { ok: true, dryRun: true } : { ok: true })
  } catch (err) {
    console.error('[newsletter] subscribe failed:', err)
    return NextResponse.json({ error: 'Subscription failed, try again later' }, { status: 502 })
  }
}

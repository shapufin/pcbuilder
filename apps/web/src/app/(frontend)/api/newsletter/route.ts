import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@buildmyrig/lib'
import { newsletterWelcomeHtml, sendResendEmail } from '@buildmyrig/plugin-shop/emails'
import { clientIp, defaultAllowedOrigins, isAllowedOrigin } from '@/lib/auth'

const limiter = rateLimit({ windowMs: 60_000, max: 5 })

const bodySchema = z.object({ email: z.string().trim().email() })

const logger = {
  info: (message: string) => console.info(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
}

export async function POST(req: NextRequest) {
  // Same gate stack as register/contact: Origin allowlist → IP limiter.
  if (!isAllowedOrigin(req.headers.get('origin'), defaultAllowedOrigins())) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }
  const ip = clientIp(req.headers)
  const rl = limiter.check(ip)
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

  // Entry 23: inline Resend fetch → shared sender (dry-run without keys) +
  // welcome template; response contract unchanged (#175).
  try {
    const result = await sendResendEmail(
      {
        to: parsed.data.email,
        subject: 'Welcome to BuildMyRig',
        html: newsletterWelcomeHtml(),
      },
      logger,
    )
    if (result.sent === false) return NextResponse.json({ ok: true, dryRun: true })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[newsletter] send failed:', err)
    return NextResponse.json({ error: 'Subscription failed, try again later' }, { status: 502 })
  }
}

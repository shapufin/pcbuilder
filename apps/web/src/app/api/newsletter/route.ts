import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@buildmyrig/lib'

const limiter = rateLimit({ windowMs: 60_000, max: 5 })

const bodySchema = z.object({ email: z.string().trim().email() })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
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
  const email = parsed.data.email

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    // Dev/dry-run: no Resend credentials (12-integrations-ops.md).
    console.log(`[newsletter] dry-run subscribe: ${email}`)
    return NextResponse.json({ ok: true, dryRun: true })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Welcome to BuildMyRig',
        html: '<p>Thanks for subscribing! You will get build deals and restock alerts — unsubscribe anytime.</p>',
      }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[newsletter] send failed:', err)
    return NextResponse.json({ error: 'Subscription failed, try again later' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@buildmyrig/lib'
import { clientIp } from '@/lib/auth'
import { confirmNewsletter } from '@/lib/newsletter'
import { newsletterDeps } from '@/lib/newsletter.server'

const limiter = rateLimit({ windowMs: 60_000, max: 20 })

/**
 * GET /api/newsletter/confirm?token= — the link in the double opt-in mail
 * (audit 2026-11-18 M3). Always redirects home with a status flag the
 * storefront can toast; the token is single-use.
 */
export async function GET(req: NextRequest) {
  const home = new URL('/', req.url)
  if (!limiter.check(clientIp(req.headers)).ok) {
    home.searchParams.set('newsletter', 'invalid')
    return NextResponse.redirect(home, 303)
  }
  const token = req.nextUrl.searchParams.get('token') ?? ''
  let status: 'confirmed' | 'invalid' = 'invalid'
  try {
    const deps = await newsletterDeps({ newToken: () => '', sendEmail: async () => undefined })
    status = await confirmNewsletter(deps, token.slice(0, 128))
  } catch (err) {
    console.error('[newsletter] confirm failed:', err)
  }
  home.searchParams.set('newsletter', status)
  return NextResponse.redirect(home, 303)
}

import { NextResponse, type NextRequest } from 'next/server'
import { accountGuard } from '@/lib/auth'

/**
 * Entry 15: bounce anonymous /account* requests to /auth/login with a safe
 * ?next (16-proxy.md — Next 16 renames middleware.ts to proxy.ts, Node
 * runtime). Cookie presence is only the fast path; the account page still
 * does the authoritative `payload.auth({ headers })` check.
 *
 * Scope deviation from 09-routes.md (documented): /checkout is NOT guarded —
 * guest checkout is a feature (07-ux-plan.md).
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has('payload-token')
  const target = accountGuard(
    request.nextUrl.pathname + request.nextUrl.search,
    hasSession,
  )
  if (target) return NextResponse.redirect(new URL(target, request.url))
  return NextResponse.next()
}

export const config = {
  matcher: '/account/:path*',
}

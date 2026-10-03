import { z } from 'zod'
import { rateLimit } from '@buildmyrig/lib'

export type RegisterDeps = {
  create: (args: {
    data: { email: string; password: string; roles: string[] }
  }) => Promise<unknown>
  limiter: { check: (key: string) => { ok: boolean; retryAfterMs: number } }
}

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
})

/** 5 registers/min/IP — signup abuse + email-enumeration throttling (11-access-security.md). */
export const registerLimiter = rateLimit({ windowMs: 60_000, max: 5 })

export const clientIp = (headers: Headers): string =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  headers.get('x-real-ip') ||
  'local'

/** Same Origin policy as Payload's CSRF allowlist (payload.config.ts): no Origin
 * (scripts/curl) is allowed — the endpoint only creates an account, it never
 * establishes a session to ride. */
export const isAllowedOrigin = (origin: string | null, allowed: string[]): boolean => {
  if (!origin) return true
  return allowed.includes(origin.replace(/\/+$/, ''))
}

/** Origin allowlist shared by register/forgot/reset/contact/newsletter —
 * mirrors the Payload CSRF allowlist (BMR_URL + localhost dev origins). */
export const defaultAllowedOrigins = (): string[] => {
  const list = ['http://localhost:3000', 'http://127.0.0.1:3000']
  const base = (process.env.BMR_URL ?? '').replace(/\/+$/, '')
  if (base) list.push(base)
  return list
}

/** Open-redirect guard for ?next= (entry-15): same-site absolute paths only. */
export const sanitizeNext = (next: unknown): string | null => {
  if (typeof next !== 'string' || next.length > 512) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\')) return null
  if (/[\\\u0000-\u001F\u007F]/.test(next)) return null
  return next
}

/** proxy.ts helper: anonymous requests to /account* bounce to login with a
 * safe ?next; anything else (session present, other path) passes through. */
export const accountGuard = (path: string, hasSession: boolean): string | null => {
  if (hasSession) return null
  const safe = sanitizeNext(path)
  if (!safe) return null
  const pathname = safe.split(/[?#]/)[0]
  if (pathname !== '/account' && !pathname.startsWith('/account/')) return null
  return `/auth/login?next=${encodeURIComponent(safe)}`
}

/** POST /api/auth/register — server-side signup with roles pinned to
 * 'customer' (overrideAccess local API, so the admin-only roles field access
 * never applies and the body can never influence it). */
export const registerUser = async (
  deps: RegisterDeps,
  input: { body: unknown; headers?: Headers },
): Promise<Response> => {
  const headers = input.headers ?? new Headers()

  if (!isAllowedOrigin(headers.get('origin'), defaultAllowedOrigins())) {
    return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  }

  const rate = deps.limiter.check(clientIp(headers))
  if (!rate.ok) {
    return Response.json(
      { error: 'Too many attempts, try again shortly' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const parsed = registerSchema.safeParse(input.body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid registration details', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    await deps.create({ data: { ...parsed.data, roles: ['customer'] } })
    return Response.json({ ok: true }, { status: 201 })
  } catch (e) {
    const err = e as {
      name?: string
      message?: string
      code?: string
      data?: { errors?: { path?: string; message?: string }[] }
      cause?: { code?: string; message?: string }
    }
    const fieldErrors = Array.isArray(err.data?.errors) ? (err.data?.errors ?? []) : []
    // Duplicate email reaches us three ways: payload's own pre-insert check
    // ("A user with the given email is already registered.", path 'email' —
    // live-probed), drizzle's handleUpsertError ValidationError ("Value must be
    // unique") on the DB race, or the raw libsql error with a 'UNIQUE
    // constraint failed' message on itself or its cause (see #88). zod has
    // already validated the email format, so any email-path field error left
    // at this point means duplicate.
    const codes = [err.code, err.cause?.code]
    const messages = `${err.message ?? ''} ${err.cause?.message ?? ''}`
    const duplicate =
      codes.some((c) => c === 'SQLITE_CONSTRAINT_UNIQUE' || c === '2067' || c === '23505') ||
      /UNIQUE constraint failed/i.test(messages) ||
      fieldErrors.some((x) => x?.path === 'email')
    if (duplicate) {
      console.error(
        `[register] duplicate email rejected: ${err.name ?? 'Error'} code=${err.cause?.code ?? err.code ?? '?'}`,
      )
      return Response.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      )
    }
    console.error(
      '[register] create failed:',
      err.name,
      err.message,
      'data=' + JSON.stringify(err.data),
      'cause=' + JSON.stringify(err.cause),
    )
    return Response.json({ error: 'Registration failed' }, { status: 500 })
  }
}

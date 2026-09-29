import { describe, expect, it, vi } from 'vitest'
import {
  accountGuard,
  isAllowedOrigin,
  registerUser,
  sanitizeNext,
  type RegisterDeps,
} from './auth.ts'

/**
 * Entry 15: auth round (register endpoint helpers). #77–#84 drive
 * registerUser with injected create/limiter deps — no payload import, no DB.
 */

const okLimiter = { check: vi.fn(() => ({ ok: true, retryAfterMs: 0 })) }

const makeDeps = (
  create: RegisterDeps['create'] = vi.fn(async () => ({ id: 1 })),
): RegisterDeps => ({ create, limiter: okLimiter })

const validBody = { email: 'builder@example.com', password: 'supersecret1' }

const register = (
  deps: RegisterDeps,
  input: { body?: unknown; headers?: Headers } = {},
): Promise<Response> =>
  registerUser(deps, {
    body: 'body' in input ? input.body : validBody,
    headers: input.headers ?? new Headers(),
  })

describe('registerUser — entry 15 (auth pages)', () => {
  it('#77 forces roles: ["customer"] and strips any extra body fields', async () => {
    const create = vi.fn(async () => ({ id: 1 }))
    const res = await register(makeDeps(create), {
      body: { ...validBody, roles: ['admin'], admin: true, id: 99 },
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      data: {
        email: 'builder@example.com',
        password: 'supersecret1',
        roles: ['customer'],
      },
    })
  })

  it('#78 invalid email / short password -> 400, create never called', async () => {
    for (const body of [
      { email: 'not-an-email', password: 'supersecret1' },
      { email: 'builder@example.com', password: 'short' },
      { password: 'supersecret1' },
      null,
    ]) {
      const create = vi.fn(async () => ({ id: 1 }))
      const res = await register(makeDeps(create), { body })
      expect(res.status).toBe(400)
      expect(create).not.toHaveBeenCalled()
    }
  })

  it('#79 duplicate email -> 409 with friendly error', async () => {
    const create = vi.fn(async () => {
      const err = new Error('The following field is invalid: email')
      err.name = 'ValidationError'
      ;(err as { data?: unknown }).data = {
        collection: 'users',
        errors: [
          { message: 'A user with the given email is already registered.', path: 'email' },
        ],
      }
      throw err
    })
    const res = await register(makeDeps(create))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/already exists/i)
  })

  it('#80 unexpected create failure -> generic 500, no internal message leak', async () => {
    const create = vi.fn(async () => {
      throw new Error('SQLITE_CONSTRAINT: table users at internal_xyz')
    })
    const res = await register(makeDeps(create))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).not.toMatch(/SQLITE|table|internal_xyz/)
  })

  it('#88 raw libsql unique violation (cause-wrapped, no ValidationError) -> 409', async () => {
    // Live probe: payload re-throws the raw DB error when its
    // handleUpsertError code gate does not match libsql's shape.
    const create = vi.fn(async () => {
      const err = new Error('database error') as Error & {
        cause?: { code?: string; message?: string }
      }
      err.cause = {
        code: 'SQLITE_CONSTRAINT',
        message: 'UNIQUE constraint failed: users.email',
      }
      throw err
    })
    const res = await register(makeDeps(create))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/already exists/i)
  })

  it('#81 rate limit: 6th register from one IP -> 429 with Retry-After; only 5 creates', async () => {
    let allowed = 5
    const limiter = {
      check: vi.fn(() =>
        allowed > 0
          ? (allowed--, { ok: true, retryAfterMs: 0 })
          : { ok: false, retryAfterMs: 30_000 },
      ),
    }
    const create = vi.fn(async () => ({ id: 1 }))
    const deps: RegisterDeps = { create, limiter }
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) statuses.push((await register(deps)).status)
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429])
    expect(create).toHaveBeenCalledTimes(5)
    const last = await register(deps)
    expect(last.headers.get('retry-after')).toBe('30')
  })

  it('#82 rejects disallowed Origin (403) and allows missing/same-origin', async () => {
    const cross = await register(makeDeps(), {
      headers: new Headers({ origin: 'https://evil.example' }),
    })
    expect(cross.status).toBe(403)
    const missing = await register(makeDeps(), { headers: new Headers() })
    expect(missing.status).toBe(201)
    const same = await register(makeDeps(), {
      headers: new Headers({ origin: 'http://localhost:3000' }),
    })
    expect(same.status).toBe(201)
    expect(isAllowedOrigin('https://shop.example.com', ['https://shop.example.com'])).toBe(true)
    expect(isAllowedOrigin('https://evil.example', ['https://shop.example.com'])).toBe(false)
    expect(isAllowedOrigin(null, [])).toBe(true)
  })
})

describe('redirect helpers — entry 15', () => {
  it('#83 sanitizeNext keeps same-site paths, rejects open redirects and header junk', () => {
    expect(sanitizeNext('/account')).toBe('/account')
    expect(sanitizeNext('/account?tab=orders')).toBe('/account?tab=orders')
    expect(sanitizeNext('//evil.example')).toBeNull()
    expect(sanitizeNext('https://evil.example')).toBeNull()
    expect(sanitizeNext('/\\evil.example')).toBeNull()
    expect(sanitizeNext('javascript:alert(1)')).toBeNull()
    expect(sanitizeNext('/account\nLocation: x')).toBeNull()
    expect(sanitizeNext('/' + 'a'.repeat(600))).toBeNull()
    expect(sanitizeNext(null)).toBeNull()
    expect(sanitizeNext(undefined)).toBeNull()
    expect(sanitizeNext(123)).toBeNull()
  })

  it('#84 accountGuard: anon /account* -> login with next; session or other paths -> null', () => {
    expect(accountGuard('/account', false)).toBe('/auth/login?next=%2Faccount')
    expect(accountGuard('/account?tab=orders', false)).toBe(
      '/auth/login?next=%2Faccount%3Ftab%3Dorders',
    )
    expect(accountGuard('/account', true)).toBeNull()
    expect(accountGuard('/', false)).toBeNull()
    expect(accountGuard('/accountancy', false)).toBeNull()
    expect(accountGuard('//evil.example', false)).toBeNull()
  })
})

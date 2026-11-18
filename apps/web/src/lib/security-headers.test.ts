import { describe, expect, it } from 'vitest'
import { securityHeaders } from './security-headers.mjs'

const byKey = (env: Record<string, string | undefined>) =>
  Object.fromEntries(securityHeaders(env).map((h: { key: string; value: string }) => [h.key, h.value]))

describe('audit 2026-11-18 M1 — security headers', () => {
  it('#736 every response forbids framing by other origins and MIME sniffing', () => {
    const h = byKey({ NODE_ENV: 'development' })
    expect(h['Content-Security-Policy']).toContain("frame-ancestors 'self'")
    expect(h['Content-Security-Policy']).toContain("object-src 'none'")
    expect(h['Content-Security-Policy']).toContain("base-uri 'self'")
    expect(h['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Permissions-Policy']).toContain('camera=()')
  })
  it('#737 HSTS only in production (localhost http must keep working)', () => {
    expect(byKey({ NODE_ENV: 'development' })['Strict-Transport-Security']).toBeUndefined()
    expect(byKey({ NODE_ENV: 'production' })['Strict-Transport-Security']).toContain('max-age=')
  })
})

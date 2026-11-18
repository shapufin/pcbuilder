/**
 * Audit 2026-11-18 (M1): baseline security headers for every route.
 * Plain .mjs so next.config.mjs can import it without a TS loader.
 *
 * The CSP is deliberately structural (framing, plugins, base/form targets)
 * rather than a script allowlist: Payload admin, Stripe Elements and Next
 * inline bootstraps need inline scripts, and a script-src without nonces
 * would break them. Tighten with nonces once the app ships to production.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ key: string, value: string }[]}
 */
export function securityHeaders(env) {
  const headers = [
    {
      key: 'Content-Security-Policy',
      value: [
        "frame-ancestors 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://checkout.stripe.com",
      ].join('; '),
    },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")' },
  ]
  if (env.NODE_ENV === 'production') {
    headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' })
  }
  return headers
}

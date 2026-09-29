type PlausibleProps = Record<string, string | number | boolean>

/**
 * Plausible analytics (12-integrations-ops.md — no cookie-consent burden, A15).
 * No-ops without NEXT_PUBLIC_PLAUSIBLE_DOMAIN or before the Plausible script
 * loads, so local dev and CI are unaffected.
 */
export const track = (event: string, props?: PlausibleProps): void => {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) return
  const plausible = (
    window as { plausible?: (e: string, opts?: { props?: PlausibleProps }) => void }
  ).plausible
  if (typeof plausible === 'function') plausible(event, props ? { props } : undefined)
}

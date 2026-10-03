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

/**
 * Funnel events (audit gap P5-X3) — spec'd but previously never fired, so
 * funnel coverage was partial. Kept here (not inline in components) so the
 * event names and prop shapes stay one testable source.
 * No PII: item titles, template slug, step name and counts only.
 */
export const trackViewItem = (item: string, priceCents?: number): void =>
  track('view_item', {
    item,
    ...(typeof priceCents === 'number' && Number.isFinite(priceCents) ? { price: priceCents / 100 } : {}),
  })

export const trackBeginBuilder = (templateSlug?: string | null): void =>
  track('begin_builder', { template: templateSlug || 'custom' })

export const trackBuildStepCompleted = (step: string, stepIndex: number, selected: number): void =>
  track('build_step_completed', { step, step_index: stepIndex + 1, selected })

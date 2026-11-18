/**
 * Builder design palettes (entry 131) — how a design that needs the mockup's
 * designed contrast ladder keeps it WITHOUT freezing the admin theme out.
 *
 * `palette: 'inherit'` designs use --color-* directly (nothing here).
 * `palette: 'accent'` designs mount this ramp on their root: the surfaces are
 * re-mixed from the live `--color-bg`/`--color-text` pair, so the ladder holds
 * its designed separation in every preset and in both visitor modes
 * (light/dark toggle included) — a hardcoded palette would break all three.
 *
 * Percentages are tuned so `--bd-line` (the interactive zone boundary) clears
 * the WCAG 1.4.11 3:1 non-text minimum against `--color-bg`; the audit
 * doc records the measured ratios for every preset.
 */
export type BuilderPaletteMode = 'inherit' | 'accent'

export const ACCENT_PALETTE: Readonly<Record<string, string>> = {
  '--bd-elev-1': 'color-mix(in srgb, var(--color-bg) 94%, var(--color-text) 6%)',
  '--bd-elev-2': 'color-mix(in srgb, var(--color-bg) 88%, var(--color-text) 12%)',
  '--bd-elev-3': 'color-mix(in srgb, var(--color-bg) 82%, var(--color-text) 18%)',
  '--bd-line-soft': 'color-mix(in srgb, var(--color-text) 38%, var(--color-bg) 62%)',
  '--bd-line': 'color-mix(in srgb, var(--color-text) 62%, var(--color-bg) 38%)',
  '--bd-line-accent': 'color-mix(in srgb, var(--color-accent) 72%, var(--color-text) 28%)',
  '--bd-grid': 'color-mix(in srgb, var(--color-text) 10%, transparent)',
}

export function builderPaletteVars(mode: BuilderPaletteMode): Record<string, string> {
  return mode === 'accent' ? { ...ACCENT_PALETTE } : {}
}

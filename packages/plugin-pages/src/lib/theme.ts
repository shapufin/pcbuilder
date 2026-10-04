export type ThemeColors = {
  bg: string
  surface: string
  surfaceRaised: string
  surfaceHover: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  primary: string
  primaryStrong: string
  primaryHover: string
  primaryHoverStrong: string
  onPrimary: string
  success: string
  successStrong: string
  warning: string
  danger: string
  info: string
}

export type Theme = {
  preset: ThemePreset
  colors: ThemeColors
  /** Code-side --color-* vars carried by the preset (scrim, glows, soft
     surfaces, accent, focus). Not admin-editable — kebab-case names. */
  extras: Record<string, string>
  radius: { sm: string; md: string; lg: string }
  fonts: { body: string; heading: string; mono: string }
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const RADIUS_VALUE = /^(?:0|[1-9]\d*)(?:\.\d+)?(?:px|rem|em|%)$/
const FONT_VALUE = /^[\w,'\-" ]{1,120}$/

export const validateColor = (v: unknown): boolean => typeof v === 'string' && HEX_COLOR.test(v.trim())
export const validateRadius = (v: unknown): boolean => typeof v === 'string' && RADIUS_VALUE.test(v.trim())
export const validateFont = (v: unknown): boolean => typeof v === 'string' && FONT_VALUE.test(v.trim())

// Precision Dark palette (legacy default; the tokens.css drift-guard
// baseline moved to RIG_DARK_COLORS — see below).
const DARK_COLORS: ThemeColors = {
  bg: '#0a0f1e',
  surface: '#121a2c',
  surfaceRaised: '#1a2540',
  surfaceHover: '#223052',
  border: '#283451',
  borderStrong: '#d7deed',
  text: '#f2f5fb',
  textMuted: '#93a0bd',
  primary: '#6468f2',
  primaryStrong: '#5550ec',
  primaryHover: '#8a8ef8',
  primaryHoverStrong: '#4a41d6',
  onPrimary: '#ffffff',
  success: '#34d399',
  successStrong: '#0ea877',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#38bdf8',
}

export const LIGHT_COLORS: ThemeColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceRaised: '#f1f5f9',
  surfaceHover: '#e2e8f0',
  border: '#cbd5e1',
  borderStrong: '#94a3b8',
  text: '#0f172a',
  textMuted: '#475569',
  primary: '#4f46e5',
  primaryStrong: '#4f46e5',
  primaryHover: '#4338ca',
  primaryHoverStrong: '#4338ca',
  onPrimary: '#ffffff',
  success: '#16a34a',
  successStrong: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#2563eb',
}

const DARK_EXTRAS: Record<string, string> = {
  accent: '#22d3ee',
  scrim: 'rgba(4, 7, 16, 0.72)',
  'primary-glow': 'rgba(100, 104, 242, 0.4)',
  'primary-soft': 'rgba(100, 104, 242, 0.14)',
  'warning-soft': 'rgba(251, 191, 36, 0.08)',
  'danger-soft': 'rgba(248, 113, 113, 0.08)',
  'info-soft': 'rgba(56, 189, 248, 0.08)',
  'success-soft': 'rgba(52, 211, 153, 0.08)',
  focus: '#8a8ef8',
}

const LIGHT_EXTRAS: Record<string, string> = {
  accent: '#0e7490',
  scrim: 'rgba(15, 23, 42, 0.45)',
  'primary-glow': 'rgba(79, 70, 229, 0.28)',
  'primary-soft': 'rgba(79, 70, 229, 0.12)',
  'warning-soft': 'rgba(217, 119, 6, 0.12)',
  'danger-soft': 'rgba(220, 38, 38, 0.1)',
  'info-soft': 'rgba(37, 99, 235, 0.1)',
  'success-soft': 'rgba(22, 163, 74, 0.1)',
  focus: '#4f46e5',
}

const MIDNIGHT_COLORS: ThemeColors = {
  bg: '#04060f',
  surface: '#0a1122',
  surfaceRaised: '#101a33',
  surfaceHover: '#16224a',
  border: '#1e2a4d',
  borderStrong: '#c9d4f0',
  text: '#eef3ff',
  textMuted: '#8b99c2',
  primary: '#22d3ee',
  primaryStrong: '#06b6d4',
  primaryHover: '#67e8f9',
  primaryHoverStrong: '#0891b2',
  onPrimary: '#04121a',
  success: '#34d399',
  successStrong: '#0ea877',
  warning: '#fbbf24',
  danger: '#fb7185',
  info: '#38bdf8',
}

const MIDNIGHT_EXTRAS: Record<string, string> = {
  accent: '#a78bfa',
  scrim: 'rgba(2, 4, 12, 0.8)',
  'primary-glow': 'rgba(34, 211, 238, 0.35)',
  'primary-soft': 'rgba(34, 211, 238, 0.12)',
  'warning-soft': 'rgba(251, 191, 36, 0.08)',
  'danger-soft': 'rgba(251, 113, 133, 0.08)',
  'info-soft': 'rgba(56, 189, 248, 0.08)',
  'success-soft': 'rgba(52, 211, 153, 0.08)',
  focus: '#67e8f9',
}

// RIG Dark palette — must equal @buildmyrig/ui tokens.css values
// (theme.server.test.ts #139c is the drift guard; update both together).
const RIG_DARK_COLORS: ThemeColors = {
  bg: '#0f131c',
  surface: '#181c24',
  surfaceRaised: '#1c2028',
  surfaceHover: '#262a33',
  border: '#2e333d',
  borderStrong: '#414754',
  text: '#dfe2ee',
  textMuted: '#8b90a0',
  primary: '#0070f3',
  primaryStrong: '#0059c5',
  primaryHover: '#4ea1ff',
  primaryHoverStrong: '#004fae',
  onPrimary: '#ffffff',
  success: '#34d399',
  successStrong: '#10b981',
  warning: '#facc15',
  danger: '#f87171',
  info: '#38bdf8',
}

// RIG extras must equal the additive --color-* block in
// @buildmyrig/ui/tokens.css (theme.server.test.ts #292 is the drift guard).
const RIG_DARK_EXTRAS: Record<string, string> = {
  accent: '#7df4ff',
  scrim: 'rgba(10, 14, 22, 0.85)',
  'primary-glow': 'rgba(125, 244, 255, 0.4)',
  'primary-soft': 'rgba(125, 244, 255, 0.15)',
  'warning-soft': 'rgba(250, 204, 21, 0.08)',
  'danger-soft': 'rgba(248, 113, 113, 0.08)',
  'info-soft': 'rgba(56, 189, 248, 0.08)',
  'success-soft': 'rgba(52, 211, 153, 0.08)',
  focus: '#7df4ff',
}

/**
 * Design presets — the admin GUI "theme swap". Each entry is a shipped
 * design: a token set the admin selects in the Theme global. `skin` names an
 * optional CSS overlay in @buildmyrig/ui/skins/ that the root layout injects
 * after the var block — that's how a preset can restyle layout without
 * touching components. Adding a design = new entry here + optional skin file.
 */
export type ThemePresetDef = {
  /** Admin-facing label for the preset select. */
  label: string
  /** Fallback values for the 18 admin-overridable color fields. */
  colors: ThemeColors
  /** Preset-tuned code-side vars emitted alongside `colors`. */
  extras: Record<string, string>
  /** Skin overlay filename in @buildmyrig/ui/skins/ (optional). */
  skin?: string
}

export const THEME_PRESETS = {
  dark: { label: 'Precision Dark', colors: DARK_COLORS, extras: DARK_EXTRAS },
  light: { label: 'Light', colors: LIGHT_COLORS, extras: LIGHT_EXTRAS },
  midnight: {
    label: 'Midnight',
    colors: MIDNIGHT_COLORS,
    extras: MIDNIGHT_EXTRAS,
    skin: 'midnight.css',
  },
  'rig-dark': {
    label: 'RIG Dark',
    colors: RIG_DARK_COLORS,
    extras: RIG_DARK_EXTRAS,
    skin: 'rig-dark.css',
  },
} satisfies Record<string, ThemePresetDef>

export type ThemePreset = keyof typeof THEME_PRESETS

/**
 * Visitor-toggle counterpart preset (entry 60): 'light' pairs with
 * 'dark'; every dark-flavored preset pairs with 'light'. The alt preset
 * ships preset-default colors — admin overrides stay scoped to the
 * admin's own preset.
 */
export const altThemePreset = (preset: ThemePreset): ThemePreset =>
  preset === 'light' ? 'dark' : 'light'

export const themePresetOptions = (): Array<{ label: string; value: ThemePreset }> =>
  (Object.entries(THEME_PRESETS) as Array<[ThemePreset, ThemePresetDef]>).map(([value, def]) => ({
    label: def.label,
    value,
  }))

const DEFAULT_RADIUS: Theme['radius'] = { sm: '4px', md: '8px', lg: '12px' }

// Default stacks lead with the next/font CSS variables declared on <html> in
// apps/web layout.tsx. var() is legal here — DEFAULT_FONTS never passes
// through validateFont (admin input still can't contain parens).
const DEFAULT_FONTS: Theme['fonts'] = {
  body: "var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  heading: "var(--font-space-grotesk), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
}

export const DEFAULT_THEME: Theme = {
  preset: 'rig-dark',
  colors: RIG_DARK_COLORS,
  extras: RIG_DARK_EXTRAS,
  radius: DEFAULT_RADIUS,
  fonts: DEFAULT_FONTS,
}

const clean = (v: unknown, test: (x: unknown) => boolean): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s || !test(s)) return null
  return s
}

const kebab = (s: string): string => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

/**
 * Step C (entry 21) - pure resolver for the `theme` global (same contract as
 * resolveSiteSettings). Every admin-supplied value is re-validated here:
 * the result is injected into an inline <style> in the root layout, so a
 * value like `red;}body{display:none` must fall back to the preset instead
 * of reaching the page (field-level validate only gates the admin form).
 */
export function resolveTheme(doc: unknown): Theme {
  const d = (doc ?? {}) as Record<string, unknown>
  const preset: ThemePreset =
    typeof d.preset === 'string' && Object.prototype.hasOwnProperty.call(THEME_PRESETS, d.preset)
      ? (d.preset as ThemePreset)
      : DEFAULT_THEME.preset
  const base = THEME_PRESETS[preset].colors
  const rawColors = (typeof d.colors === 'object' && d.colors !== null ? d.colors : {}) as Record<string, unknown>
  const rawRadius = (typeof d.radius === 'object' && d.radius !== null ? d.radius : {}) as Record<string, unknown>
  const rawFonts = (typeof d.fonts === 'object' && d.fonts !== null ? d.fonts : {}) as Record<string, unknown>

  const colors = {} as ThemeColors
  for (const key of Object.keys(base) as Array<keyof ThemeColors>) {
    colors[key] = clean(rawColors[key], validateColor) ?? base[key]
  }
  const radius = {} as Theme['radius']
  for (const key of ['sm', 'md', 'lg'] as const) {
    radius[key] = clean(rawRadius[key], validateRadius) ?? DEFAULT_RADIUS[key]
  }
  const fonts = {} as Theme['fonts']
  for (const key of ['body', 'heading', 'mono'] as const) {
    fonts[key] = clean(rawFonts[key], validateFont) ?? DEFAULT_FONTS[key]
  }
  return { preset, colors, extras: { ...THEME_PRESETS[preset].extras }, radius, fonts }
}

/**
 * One `:root{...}` block for the root layout's inline <style>, overriding
 * the static defaults in @buildmyrig/ui/tokens.css.
 */
export function buildThemeCss(theme: Theme): string {
  const vars: string[] = []
  for (const [key, value] of Object.entries(theme.colors)) vars.push(`--color-${kebab(key)}: ${value};`)
  for (const [key, value] of Object.entries(theme.extras)) vars.push(`--color-${kebab(key)}: ${value};`)
  for (const [key, value] of Object.entries(theme.radius)) vars.push(`--radius-${key}: ${value};`)
  for (const [key, value] of Object.entries(theme.fonts)) vars.push(`--font-${key}: ${value};`)
  return `:root{${vars.join('')}}`
}

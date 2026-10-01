export type ThemePreset = 'dark' | 'light'

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
  radius: { sm: string; md: string; lg: string }
  fonts: { body: string; heading: string; mono: string }
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const RADIUS_VALUE = /^(?:0|[1-9]\d*)(?:\.\d+)?(?:px|rem|em|%)$/
const FONT_VALUE = /^[\w,'\-" ]{1,120}$/

export const validateColor = (v: unknown): boolean => typeof v === 'string' && HEX_COLOR.test(v.trim())
export const validateRadius = (v: unknown): boolean => typeof v === 'string' && RADIUS_VALUE.test(v.trim())
export const validateFont = (v: unknown): boolean => typeof v === 'string' && FONT_VALUE.test(v.trim())

const DARK_COLORS: ThemeColors = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceRaised: '#243449',
  surfaceHover: '#2c3f61',
  border: '#334155',
  borderStrong: '#cbd5e1',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  primary: '#6366f1',
  primaryStrong: '#4f46e5',
  primaryHover: '#818cf8',
  primaryHoverStrong: '#4338ca',
  onPrimary: '#ffffff',
  success: '#34d399',
  successStrong: '#059669',
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

const DEFAULT_RADIUS: Theme['radius'] = { sm: '4px', md: '8px', lg: '12px' }

const DEFAULT_FONTS: Theme['fonts'] = {
  body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  heading: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
}

export const DEFAULT_THEME: Theme = {
  preset: 'dark',
  colors: DARK_COLORS,
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
  const preset: ThemePreset = d.preset === 'light' ? 'light' : 'dark'
  const base = preset === 'light' ? LIGHT_COLORS : DARK_COLORS
  const rawColors = (typeof d.colors === 'object' && d.colors !== null ? d.colors : {}) as Record<string, unknown>
  const rawRadius = (typeof d.radius === 'object' && d.radius !== null ? d.radius : {}) as Record<string, unknown>
  const rawFonts = (typeof d.fonts === 'object' && d.fonts !== null ? d.fonts : {}) as Record<string, unknown>

  const colors = {} as ThemeColors
  for (const key of Object.keys(DARK_COLORS) as Array<keyof ThemeColors>) {
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
  return { preset, colors, radius, fonts }
}

/**
 * One `:root{...}` block for the root layout's inline <style>, overriding
 * the static defaults in @buildmyrig/ui/tokens.css.
 */
export function buildThemeCss(theme: Theme): string {
  const vars: string[] = []
  for (const [key, value] of Object.entries(theme.colors)) vars.push(`--color-${kebab(key)}: ${value};`)
  for (const [key, value] of Object.entries(theme.radius)) vars.push(`--radius-${key}: ${value};`)
  for (const [key, value] of Object.entries(theme.fonts)) vars.push(`--font-${key}: ${value};`)
  return `:root{${vars.join('')}}`
}

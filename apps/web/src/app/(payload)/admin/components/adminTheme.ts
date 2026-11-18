/**
 * Admin skin catalog + applier, shared by the site-settings theme cards
 * (`AdminThemeCards`) and the legacy site-settings header telemetry.
 *
 * The applier only touches the DOM (data attributes, localStorage, cookie) and
 * broadcasts `bmr-admin-theme-change` — it deliberately knows nothing about
 * Payload's form state, so it can run inside or outside a `<Form>` provider.
 */

const toHex = (digits: string): string => String.fromCharCode(35) + digits

export const ADMIN_THEMES_CATALOG = [
  {
    id: 'precision-dark',
    label: 'Precision Dark',
    badge: 'Dark SaaS',
    bg: toHex('090d16'),
    surface: toHex('0d121f'),
    accent: toHex('38bdf8'),
    desc: 'Modern Slate Dark with glowing cyan accents and precision contrast.',
  },
  {
    id: 'aether-foundry',
    label: 'Aether Foundry',
    badge: 'Workstation',
    bg: toHex('09090b'),
    surface: toHex('14141a'),
    accent: toHex('fbbf24'),
    desc: 'Luxury engineering workstation with hairline gold accents.',
  },
  {
    id: 'aether-frost',
    label: 'Titanium Frost',
    badge: 'Titanium Lab',
    bg: toHex('f8fafc'),
    surface: toHex('ffffff'),
    accent: toHex('d97706'),
    desc: 'Clean-room titanium white with warm amber telemetry accents.',
  },
  {
    id: 'cyber-neon',
    label: 'Cyber Neon',
    badge: 'High-Contrast',
    bg: toHex('080811'),
    surface: toHex('12122b'),
    accent: toHex('00ffcc'),
    desc: 'Futuristic high-contrast neon palette with glowing teal accents.',
  },
  {
    id: 'light-clean',
    label: 'Light Clean',
    badge: 'High-Vis',
    bg: toHex('f8fafc'),
    surface: toHex('ffffff'),
    accent: toHex('0284c7'),
    desc: 'High-visibility light theme optimized for daylight environments.',
  },
  {
    id: 'classic-payload',
    label: 'Classic Payload',
    badge: 'Neutral',
    bg: toHex('121212'),
    surface: toHex('1a1a1a'),
    accent: toHex('333333'),
    desc: 'Standard neutral monochrome Payload CMS theme.',
  },
] as const

export type AdminThemeID = (typeof ADMIN_THEMES_CATALOG)[number]['id']

export const ADMIN_THEME_IDS: readonly string[] = ADMIN_THEMES_CATALOG.map((t) => t.id)

export const ADMIN_THEME_LABELS: Record<string, string> = {
  'precision-dark': 'Precision Dark',
  'aether-foundry': 'Aether Foundry',
  'aether-frost': 'Aether Frost',
  'cyber-neon': 'Cyber Neon',
  'light-clean': 'Light Clean',
  'classic-payload': 'Classic Payload',
}

/** Which Payload colour mode a skin belongs to. Our CSS keys on
 *  `data-admin-theme`, but Payload's own components (Monaco code editors,
 *  date pickers, react-select) read `data-theme` / the `payload-theme` cookie —
 *  with the two out of sync the JSON field rendered a white Monaco editor on
 *  the dark skin (audit 2026-10-22, item 678). */
export const payloadThemeFor = (skinId: string): 'dark' | 'light' =>
  skinId === 'light-clean' || skinId === 'aether-frost' ? 'light' : 'dark'

/** Apply the skin and broadcast it.
 *
 *  `broadcast: false` is for listeners of `bmr-admin-theme-change` themselves —
 *  re-dispatching from inside the handler recursed until the stack blew
 *  ("Maximum call stack size exceeded", caught in the skin sweep). */
export const applyAdminTheme = (themeId: string, broadcast = true): void => {
  if (typeof document === 'undefined') return
  const mode = payloadThemeFor(themeId)
  document.documentElement.setAttribute('data-admin-theme', themeId)
  document.documentElement.setAttribute('data-theme', mode)
  try {
    localStorage.setItem('bmr_admin_theme', themeId)
  } catch {}
  document.cookie = `bmr_admin_theme=${themeId}; path=/; max-age=31536000; SameSite=Lax`
  // Payload's ThemeProvider only follows the cookie when admin.theme === 'all'
  // (payload.config.ts). Keep it in step with the skin so its components match.
  document.cookie = `payload-theme=${mode}; path=/; max-age=31536000; SameSite=Lax`
  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bmr-admin-theme-change', { detail: themeId }))
  }
}

/** Apply the skin visually and (when a form setter is available) sync the field. */
export const selectAdminTheme = (
  themeId: string,
  setAdminThemeField?: (val: unknown) => void,
): void => {
  applyAdminTheme(themeId)
  if (typeof setAdminThemeField === 'function') {
    setAdminThemeField(themeId)
  }
}

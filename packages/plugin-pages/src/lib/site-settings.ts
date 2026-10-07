export type NavLink = { label: string; url: string }

export type AdminThemeOption = 'precision-dark' | 'cyber-neon' | 'classic-payload' | 'light-clean'

export type SiteSettings = {
  navLinks: NavLink[]
  footerLinks: NavLink[]
  /**
   * Announcement-strip lines (entry 71 — Nexus telemetry bar; other packs
   * may surface it later). Empty = strip hidden.
   */
  announcements: string[]
  /** Admin CMS Back-Office GUI Theme skin */
  adminTheme?: AdminThemeOption
}

/**
 * Entry 18 (Step A): header/footer links moved out of the hardcoded
 * components into the `site-settings` global (admin-editable). These
 * defaults serve both as the resolver fallback (global not created yet)
 * and as the array-field defaults prefilled in the admin form.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  navLinks: [
    { label: 'Shop', url: '/shop' },
    { label: 'Builder', url: '/builder' },
  ],
  footerLinks: [
    { label: 'About', url: '/about' },
    { label: 'FAQ', url: '/faq' },
    { label: 'Contact', url: '/contact' },
    { label: 'Terms', url: '/terms' },
    { label: 'Privacy', url: '/privacy' },
  ],
  announcements: [
    'FREE FLIGHT-CRATE SHIPPING ON ALL PRE-BUILT WORKSTATIONS',
    'NEW: GOLDEN SAMPLE SP114+ SILICON IN STOCK',
  ],
  adminTheme: 'precision-dark',
}

const MAX_LABEL = 60
const MAX_URL = 2048

/**
 * Internal path (`/x`, not `//host`) or https absolute — rejects `javascript:`
 * etc. Backslashes are rejected because WHATWG URL parsing treats `\` as `/`,
 * so `/\evil.com` resolves cross-origin like `//evil.com` would (review 19).
 */
export function isSafeNavLinkUrl(url: string): boolean {
  if (url.includes('\\')) return false
  return /^\/(?!\/)/.test(url) || url.startsWith('https://')
}

function cleanLinks(raw: unknown): NavLink[] | null {
  if (!Array.isArray(raw)) return null // missing key → fall back to defaults
  const out: NavLink[] = []
  for (const entry of raw as Array<{ label?: unknown; url?: unknown } | null | undefined>) {
    if (!entry || typeof entry !== 'object') continue
    const label = typeof entry.label === 'string' ? entry.label.trim().slice(0, MAX_LABEL) : ''
    const url = typeof entry.url === 'string' ? entry.url.trim().slice(0, MAX_URL) : ''
    if (!label || !url || !isSafeNavLinkUrl(url)) continue
    out.push({ label, url })
  }
  return out // [] is a deliberate "show nothing" choice
}

const MAX_ANNOUNCEMENT = 160

function cleanAnnouncements(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null // missing key → fall back to defaults
  return raw
    .map((entry) =>
      typeof entry === 'string'
        ? entry.trim()
        : typeof (entry as { text?: unknown })?.text === 'string'
          ? ((entry as { text: string }).text ?? '').trim()
          : '',
    )
    .filter((text) => text.length > 0)
    .map((text) => text.slice(0, MAX_ANNOUNCEMENT))
}

const VALID_ADMIN_THEMES = new Set<AdminThemeOption>([
  'precision-dark',
  'cyber-neon',
  'classic-payload',
  'light-clean',
])

export function resolveSiteSettings(doc: unknown): SiteSettings {
  const d = (doc ?? {}) as Record<string, unknown>
  const adminTheme =
    typeof d.adminTheme === 'string' && VALID_ADMIN_THEMES.has(d.adminTheme as AdminThemeOption)
      ? (d.adminTheme as AdminThemeOption)
      : DEFAULT_SITE_SETTINGS.adminTheme

  return {
    navLinks: cleanLinks(d.navLinks) ?? DEFAULT_SITE_SETTINGS.navLinks,
    footerLinks: cleanLinks(d.footerLinks) ?? DEFAULT_SITE_SETTINGS.footerLinks,
    announcements: cleanAnnouncements(d.announcements) ?? DEFAULT_SITE_SETTINGS.announcements,
    adminTheme,
  }
}

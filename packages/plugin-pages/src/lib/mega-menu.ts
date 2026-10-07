import { isSafeNavLinkUrl } from './site-settings.ts'

/**
 * Entry 71 (Nexus) — admin-editable mega menu. The `mega-menu` global stores
 * the same data the AI Studio app kept in React state (`INITIAL_MEGA_MENU_
 * SECTIONS` + the admin modal); this resolver is the single normalization
 * point — every URL is re-checked against isSafeNavLinkUrl and every icon
 * against the closed ICON set so a hostile or stale doc can never inject an
 * unsafe href or an unknown icon id into the storefront.
 *
 * Route mapping from the source app: `path:'shop' + filterCategory:'gpu'`
 * becomes `/shop/gpu`; `path:'categories'` (the slot explorer) becomes
 * `/explorer`; `path:'product'` becomes a product URL the admin supplies.
 */

export const MEGA_MENU_ICONS = [
  'speed',
  'cpu',
  'fan',
  'memory',
  'hard-drive',
  'zap',
  'box',
  'chip',
] as const
export type MegaMenuIcon = (typeof MEGA_MENU_ICONS)[number]

export type MegaMenuItem = {
  label: string
  subtitle: string
  url: string
  badge?: string
  icon?: MegaMenuIcon
}

export type MegaMenuPromo = {
  title: string
  description: string
  buttonText: string
  /** Resolved media URL (empty when the upload is missing/unpopulated). */
  imageUrl: string
  url: string
}

export type MegaMenuSection = {
  title: string
  description: string
  /** Header link this flyout opens under — e.g. `/shop`. */
  url: string
  items: MegaMenuItem[]
  featuredPromo?: MegaMenuPromo
}

export type MegaMenu = { sections: MegaMenuSection[] }

const MAX_TEXT = 200

const cleanText = (v: unknown, max = MAX_TEXT): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

const cleanUrl = (v: unknown): string => {
  if (typeof v !== 'string') return ''
  const url = v.trim().slice(0, 2048)
  return isSafeNavLinkUrl(url) ? url : ''
}

const cleanIcon = (v: unknown): MegaMenuIcon | undefined =>
  typeof v === 'string' && (MEGA_MENU_ICONS as readonly string[]).includes(v)
    ? (v as MegaMenuIcon)
    : undefined

const cleanBadge = (v: unknown): string | undefined => {
  const badge = cleanText(v, 40)
  return badge || undefined
}

const mediaUrl = (v: unknown): string => {
  // findGlobal depth≥1 yields a populated doc; shallow fetches yield an id.
  if (v && typeof v === 'object') {
    const url = (v as { url?: unknown }).url
    if (typeof url === 'string' && url.startsWith('/')) return url
  }
  return ''
}

const cleanItems = (raw: unknown): MegaMenuItem[] => {
  if (!Array.isArray(raw)) return []
  const out: MegaMenuItem[] = []
  for (const entry of raw as Array<Record<string, unknown> | null | undefined>) {
    if (!entry || typeof entry !== 'object') continue
    const label = cleanText(entry.label, 60)
    const url = cleanUrl(entry.url)
    if (!label || !url) continue
    const item: MegaMenuItem = { label, subtitle: cleanText(entry.subtitle), url }
    const badge = cleanBadge(entry.badge)
    const icon = cleanIcon(entry.icon)
    if (badge) item.badge = badge
    if (icon) item.icon = icon
    out.push(item)
  }
  return out
}

const cleanPromo = (raw: unknown): MegaMenuPromo | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const p = raw as Record<string, unknown>
  const title = cleanText(p.title, 80)
  const url = cleanUrl(p.url)
  if (!title || !url) return undefined
  return {
    title,
    description: cleanText(p.description, 400),
    buttonText: cleanText(p.buttonText, 60) || 'View',
    imageUrl: mediaUrl(p.image),
    url,
  }
}

/**
 * Never throws; empty/missing sections fall back to DEFAULT_MEGA_MENU so a
 * fresh DB still shows a usable flyout. A deliberately emptied `sections`
 * array resolves to [] — the Nexus header then hides the flyout trigger.
 */
export function resolveMegaMenu(doc: unknown): MegaMenu {
  const d = (doc ?? {}) as Record<string, unknown>
  if (!Array.isArray(d.sections)) return DEFAULT_MEGA_MENU
  const sections: MegaMenuSection[] = []
  for (const entry of d.sections as Array<Record<string, unknown> | null | undefined>) {
    if (!entry || typeof entry !== 'object') continue
    const title = cleanText(entry.title, 60)
    if (!title) continue
    const section: MegaMenuSection = {
      title,
      description: cleanText(entry.description),
      url: cleanUrl(entry.url) || '/shop',
      items: cleanItems(entry.items),
    }
    const promo = cleanPromo(entry.featuredPromo)
    if (promo) section.featuredPromo = promo
    sections.push(section)
  }
  return { sections }
}

/** Ported from shop layout/src/data/products.ts INITIAL_MEGA_MENU_SECTIONS. */
export const DEFAULT_MEGA_MENU: MegaMenu = {
  sections: [
    {
      title: 'Component Ecosystem',
      description:
        'Direct foundry silicon drops, architectural cooling, and high-frequency memory modules.',
      url: '/shop',
      // Shop category slugs are plural in seed.ts (gpus/psus/motherboards);
      // builder slot slugs are singular — do not conflate the two.
      items: [
        { label: 'GPU', subtitle: 'PCIe 5.0 GPUs, Ada Lovelace, RDNA3', url: '/shop/gpus', icon: 'speed', badge: 'Category' },
        { label: 'CPU', subtitle: 'LGA1700, AM5, Threadripper Pro', url: '/shop/cpu', icon: 'cpu', badge: 'Category' },
        { label: 'COOLING', subtitle: '360mm AIOs, Custom Distro Plates', url: '/shop/cooling', icon: 'fan', badge: 'Category' },
        { label: 'MEMORY', subtitle: 'DDR5 6000-8000 MT/s, Low CL30', url: '/shop/ram', icon: 'memory', badge: 'Category' },
        { label: 'STORAGE', subtitle: 'Up to 12,400 MB/s DirectStorage', url: '/shop/storage', icon: 'hard-drive', badge: 'Category' },
        { label: 'POWER', subtitle: 'ATX 3.1 1000W-1600W Native 12V', url: '/shop/psus', icon: 'zap', badge: 'Category' },
      ],
      featuredPromo: {
        title: 'Golden Sample SP114+ Silicon',
        description:
          'Hand-selected processors capable of stable 6.2GHz single core with laser-checked voltage frequency curve.',
        buttonText: 'View Binned Drops',
        imageUrl: '',
        url: '/shop',
      },
    },
    {
      title: 'Pre-Built Workstations',
      description: 'ISO Class 6 laminar cleanroom assembled turnkey workstation tiers.',
      url: '/shop',
      items: [
        { label: 'Tier I — Compact SFF', subtitle: '32L compact audio & 3D footprint', url: '/shop?prebuilt-tier=entry', badge: 'Tier I' },
        { label: 'Tier II — Flagship', subtitle: 'ML & Unreal Engine loop', url: '/shop?prebuilt-tier=high', badge: 'Tier II · Featured' },
        { label: 'Tier III — Lab Node', subtitle: 'Dual-GPU + Threadripper node', url: '/shop?prebuilt-tier=extreme', badge: 'Tier III' },
      ],
      featuredPromo: {
        title: 'Cleanroom-Assembled Tiers',
        description:
          'Factory-delidded CPU, custom acrylic distro loop, cleanroom tested for 72 hours under FurMark and Prime95.',
        buttonText: 'Browse Pre-Builts',
        imageUrl: '',
        url: '/shop',
      },
    },
    {
      title: 'Interactive Architecture',
      description: 'Visual motherboard component mapping & 3D studio.',
      url: '/explorer',
      items: [
        { label: 'Motherboard Slot Explorer', subtitle: 'Animated mounting experience with sparkle explosions', url: '/explorer', icon: 'chip', badge: 'Interactive' },
        { label: 'Custom Rig Configurator', subtitle: 'Compatibility-checked part picking', url: '/builder', icon: 'box', badge: 'Builder' },
        { label: 'Full Catalog', subtitle: 'Every component, searchable and filterable', url: '/shop', icon: 'speed' },
      ],
    },
  ],
}

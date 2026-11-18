import type { MegaMenuSection, NavLink } from '@buildmyrig/plugin-pages'
import { AetherHeaderClient } from './client/AetherHeaderClient'

type ThemeLabels = { altLabel: string; defaultLabel: string }

/**
 * Aether pack header (entry 124) — server boundary component rendering the
 * luxury workstation chrome ported from SHOP_THEME_2.tsx.
 */
export function AetherHeader({
  navLinks,
  announcements,
  megaMenu,
  themeLabels,
}: {
  navLinks: NavLink[]
  announcements: string[]
  megaMenu: MegaMenuSection[]
  themeLabels?: ThemeLabels
}) {
  return (
    <header className="ae-header" role="banner">
      <AetherHeaderClient
        navLinks={navLinks}
        announcements={announcements}
        megaMenu={megaMenu}
        themeLabels={themeLabels}
      />
    </header>
  )
}

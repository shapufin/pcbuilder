import type { MegaMenuSection, NavLink } from '@buildmyrig/plugin-pages'
import { NexusHeaderClient } from './client/NexusHeaderClient'

type ThemeLabels = { altLabel: string; defaultLabel: string }

/**
 * Nexus pack header (entry 71) — server boundary: resolves nothing itself
 * (layout hands in site-settings + mega-menu data); all interactivity lives
 * in the client island so the chrome stays cheap to render.
 */
export function NexusHeader({
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
    <header className="nx-shell" role="banner">
      <NexusHeaderClient
        navLinks={navLinks}
        announcements={announcements}
        megaMenu={megaMenu}
        themeLabels={themeLabels}
      />
    </header>
  )
}

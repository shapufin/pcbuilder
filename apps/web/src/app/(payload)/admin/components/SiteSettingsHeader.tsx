'use client'

import React, { useEffect, useState, useSyncExternalStore } from 'react'
import {
  Navigation,
  PanelBottom,
  Megaphone,
  MonitorCog,
  Palette,
  Menu,
  Store,
} from 'lucide-react'
import { MetricCard, AlertBanner, Button } from '../ui'
import { ADMIN_THEME_IDS, ADMIN_THEME_LABELS } from './adminTheme.ts'

export interface SiteSettingsTelemetryStats {
  navLinksCount: number
  footerLinksCount: number
  announcementsCount: number
  adminThemeLabel: string
}

interface SiteSettingsHeaderProps {
  stats?: SiteSettingsTelemetryStats
  /** Payload passes the static admin.description — unused, the header is self-describing. */
  description?: unknown
}

// Re-exported for existing callers (CommandPalette-era imports + tests).
export { ADMIN_THEMES_CATALOG, applyAdminTheme, selectAdminTheme } from './adminTheme.ts'

const DEFAULT_STATS: SiteSettingsTelemetryStats = {
  navLinksCount: 2,
  footerLinksCount: 5,
  announcementsCount: 2,
  adminThemeLabel: 'Precision Dark',
}

const subscribeTheme = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr-admin-theme-change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr-admin-theme-change', cb)
  }
}

const getThemeSnapshot = (): string => {
  try {
    const stored = localStorage.getItem('bmr_admin_theme')
    const rootTheme = document.documentElement.getAttribute('data-admin-theme')
    const val = stored || rootTheme
    if (val && ADMIN_THEME_IDS.includes(val)) {
      return val
    }
  } catch {}
  return 'precision-dark'
}

const getThemeServerSnapshot = (): string => 'precision-dark'

export const SiteSettingsHeader: React.FC<SiteSettingsHeaderProps> = ({ stats: propStats }) => {
  const [fetchedStats, setFetchedStats] = useState<SiteSettingsTelemetryStats | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const activeTheme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)

  const stats = propStats || fetchedStats || DEFAULT_STATS
  const effectiveTheme = activeTheme

  useEffect(() => {
    if (propStats) return

    let isMounted = true
    fetch('/api/globals/site-settings?depth=0', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!isMounted || !doc) return
        const adminTheme =
          typeof doc.adminTheme === 'string' ? doc.adminTheme : 'precision-dark'
        setFetchedStats({
          navLinksCount: Array.isArray(doc.navLinks) ? doc.navLinks.length : 0,
          footerLinksCount: Array.isArray(doc.footerLinks) ? doc.footerLinks.length : 0,
          announcementsCount: Array.isArray(doc.announcements) ? doc.announcements.length : 0,
          adminThemeLabel: ADMIN_THEME_LABELS[adminTheme] ?? 'Precision Dark',
        })
      })
      .catch(() => {
        // Fallback gracefully on default stats
      })

    return () => {
      isMounted = false
    }
  }, [propStats])

  return (
    <div className="bmr-collection-header bmr-global-header">
      {/* 1. Scope badge & Quick Actions */}
      <div className="bmr-collection-header__top">
        <div className="bmr-collection-header__title-group">
          <div className="bmr-collection-header__title-wrap">
            <span className="bmr-badge bmr-badge--info">Global Settings</span>
            <span className="bmr-global-header__scope">Settings &amp; Design · Environment</span>
          </div>
          <p className="bmr-collection-header__subtitle">
            Storefront identity, header &amp; footer navigation, announcement telemetry, and admin console skin.
          </p>
        </div>

        <div className="bmr-collection-header__actions">
          <Button
            variant="outline"
            size="sm"
            href="/admin/globals/theme"
            aria-label="Open Theme Global"
          >
            <Palette className="bmr-btn-icon" />
            <span>Theme ↗</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            href="/admin/globals/mega-menu"
            aria-label="Open Mega Menu Global"
          >
            <Menu className="bmr-btn-icon" />
            <span>Mega Menu ↗</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Storefront"
          >
            <Store className="bmr-btn-icon" />
            <span>Storefront ↗</span>
          </Button>
        </div>
      </div>

      {/* 2. Operational Notice Banner */}
      {!bannerDismissed && (
        <div className="bmr-collection-header__alert-wrap">
          <AlertBanner
            severity="info"
            title="Storefront Propagation &amp; Layout Revalidation"
            description="Navigation links, announcement-strip lines, and the admin skin propagate on save — the theme-revalidate plugin refreshes the root layout on save, so edits reach the storefront without a deploy."
            action={{
              label: 'View Storefront',
              href: '/',
              external: true,
            }}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* 3. 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-collection-header__kpis">
        <MetricCard
          label="HEADER LINKS"
          value={stats.navLinksCount}
          subtext="primary navigation entries"
          trend={{ direction: 'neutral', label: 'chrome' }}
          icon={Navigation}
        />
        <MetricCard
          label="FOOTER LINKS"
          value={stats.footerLinksCount}
          subtext="footer navigation entries"
          trend={{ direction: 'neutral', label: 'chrome' }}
          icon={PanelBottom}
        />
        <MetricCard
          label="ANNOUNCEMENTS"
          value={stats.announcementsCount}
          subtext="telemetry-strip lines live"
          trend={{ direction: 'up', label: 'broadcast' }}
          icon={Megaphone}
        />
        <MetricCard
          label="ADMIN SKIN"
          value={
            propStats
              ? propStats.adminThemeLabel
              : ADMIN_THEME_LABELS[effectiveTheme] || stats.adminThemeLabel
          }
          subtext="back-office visual preset"
          trend={{ direction: 'neutral', label: 'skin' }}
          icon={MonitorCog}
        />
      </div>
    </div>
  )
}

export default SiteSettingsHeader

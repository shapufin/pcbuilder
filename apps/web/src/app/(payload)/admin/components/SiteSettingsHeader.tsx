'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
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

const ADMIN_THEME_LABELS: Record<string, string> = {
  'precision-dark': 'Precision Dark',
  'cyber-neon': 'Cyber Neon',
  'light-clean': 'Light Clean',
  'classic-payload': 'Classic Payload',
}

const DEFAULT_STATS: SiteSettingsTelemetryStats = {
  navLinksCount: 2,
  footerLinksCount: 5,
  announcementsCount: 2,
  adminThemeLabel: 'Precision Dark',
}

export const SiteSettingsHeader: React.FC<SiteSettingsHeaderProps> = ({ stats: propStats }) => {
  const [fetchedStats, setFetchedStats] = useState<SiteSettingsTelemetryStats | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const stats = propStats || fetchedStats || DEFAULT_STATS

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
          <Link href="/admin/globals/theme">
            <Button variant="outline" size="sm" aria-label="Open Theme Global">
              <Palette className="bmr-btn-icon" />
              Theme ↗
            </Button>
          </Link>

          <Link href="/admin/globals/mega-menu">
            <Button variant="outline" size="sm" aria-label="Open Mega Menu Global">
              <Menu className="bmr-btn-icon" />
              Mega Menu ↗
            </Button>
          </Link>

          <Link href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm" aria-label="Open Storefront">
              <Store className="bmr-btn-icon" />
              Storefront ↗
            </Button>
          </Link>
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
          value={stats.adminThemeLabel}
          subtext="back-office visual preset"
          trend={{ direction: 'neutral', label: 'skin' }}
          icon={MonitorCog}
        />
      </div>
    </div>
  )
}

export default SiteSettingsHeader

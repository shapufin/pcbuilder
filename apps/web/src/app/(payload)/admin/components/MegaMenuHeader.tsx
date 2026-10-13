'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutPanelTop,
  ListTree,
  Star,
  Eye,
  Settings,
  Palette,
  Store,
} from 'lucide-react'
import { MetricCard, AlertBanner, Button } from '../ui'

export interface MegaMenuTelemetryStats {
  sectionsCount: number
  itemsCount: number
  promoCount: number
  menuStatus: string
}

interface MegaMenuHeaderProps {
  stats?: MegaMenuTelemetryStats
  /** Payload passes the static admin.description — unused, the header is self-describing. */
  description?: unknown
}

const DEFAULT_STATS: MegaMenuTelemetryStats = {
  sectionsCount: 0,
  itemsCount: 0,
  promoCount: 0,
  menuStatus: 'Hidden',
}

interface MenuSectionDoc {
  title?: unknown
  items?: unknown[]
  featuredPromo?: { title?: unknown; url?: unknown }
}

/**
 * Derives KPIs from the raw REST doc while mirroring `resolveMegaMenu`'s
 * drops: sections without a title never render, and promos need both a
 * title and a url to be kept.
 */
export const megaMenuStatsFromDoc = (doc: Record<string, unknown>): MegaMenuTelemetryStats => {
  const raw = Array.isArray(doc.sections) ? (doc.sections as MenuSectionDoc[]) : []
  const sections = raw.filter(
    (s) => typeof s.title === 'string' && s.title.trim().length > 0,
  )
  return {
    sectionsCount: sections.length,
    itemsCount: sections.reduce((n, s) => n + (Array.isArray(s.items) ? s.items.length : 0), 0),
    promoCount: sections.filter(
      (s) =>
        typeof s.featuredPromo?.title === 'string' &&
        s.featuredPromo.title.trim() !== '' &&
        typeof s.featuredPromo?.url === 'string' &&
        s.featuredPromo.url.trim() !== '',
    ).length,
    menuStatus: sections.length > 0 ? 'Live' : 'Hidden',
  }
}

export const MegaMenuHeader: React.FC<MegaMenuHeaderProps> = ({ stats: propStats }) => {
  const [fetchedStats, setFetchedStats] = useState<MegaMenuTelemetryStats | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const stats = propStats || fetchedStats || DEFAULT_STATS

  useEffect(() => {
    if (propStats) return

    let isMounted = true
    fetch('/api/globals/mega-menu?depth=0', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!isMounted || !doc) return
        setFetchedStats(megaMenuStatsFromDoc(doc))
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
            <span className="bmr-badge bmr-badge--info">Storefront Chrome</span>
            <span className="bmr-global-header__scope">Settings &amp; Design · Navigation</span>
          </div>
          <p className="bmr-collection-header__subtitle">
            Nexus header flyout — sections, items, and the featured promo card. An empty list hides the menu trigger.
          </p>
        </div>

        <div className="bmr-collection-header__actions">
          <Link href="/admin/globals/site-settings">
            <Button variant="outline" size="sm" aria-label="Open Site Settings Global">
              <Settings className="bmr-btn-icon" />
              Site Settings ↗
            </Button>
          </Link>

          <Link href="/admin/globals/theme">
            <Button variant="outline" size="sm" aria-label="Open Theme Global">
              <Palette className="bmr-btn-icon" />
              Theme ↗
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
            title="Safe-URL Enforcement &amp; Flyout Visibility"
            description="Every link is re-validated server-side — internal paths or https:// only. Sections with a promo but no URL drop the promo at render; an empty sections list hides the flyout trigger entirely."
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
          label="FLYOUT SECTIONS"
          value={stats.sectionsCount}
          subtext="mega-menu panels"
          trend={{ direction: 'neutral', label: 'chrome' }}
          icon={LayoutPanelTop}
        />
        <MetricCard
          label="MENU ITEMS"
          value={stats.itemsCount}
          subtext="links across sections"
          trend={{ direction: 'neutral', label: 'nav' }}
          icon={ListTree}
        />
        <MetricCard
          label="PROMO CARDS"
          value={stats.promoCount}
          subtext="featured promos live"
          trend={{ direction: 'up', label: 'promo' }}
          icon={Star}
        />
        <MetricCard
          label="MENU STATUS"
          value={stats.menuStatus}
          subtext="flyout trigger state"
          trend={{ direction: 'neutral', label: 'visibility' }}
          icon={Eye}
        />
      </div>
    </div>
  )
}

export default MegaMenuHeader

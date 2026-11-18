'use client'

import React, { useEffect, useState } from 'react'
import {
  LayoutPanelTop,
  ListTree,
  Star,
  Eye,
  Settings,
  Palette,
  Store,
  AlertTriangle,
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
  /** Payload passes the static admin.description - unused, the header is self-describing. */
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
  const [loading, setLoading] = useState<boolean>(!propStats)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const stats = propStats || fetchedStats || DEFAULT_STATS

  useEffect(() => {
    if (propStats) return
    let isMounted = true
    fetch('/api/globals/mega-menu?depth=0', { credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText || 'Failed to load mega menu'}`)
        }
        return r.json()
      })
      .then((doc) => {
        if (isMounted && doc) {
          setFetchedStats(megaMenuStatsFromDoc(doc))
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load menu telemetry')
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [propStats, retryCount])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setRetryCount((c) => c + 1)
  }

  const isLoading = loading && !propStats && !fetchedStats

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
            Nexus header flyout - sections, items, and the featured promo card. An empty list hides the menu trigger.
          </p>
        </div>

        <div className="bmr-collection-header__actions">
          <Button
            variant="outline"
            size="sm"
            href="/admin/globals/site-settings"
            aria-label="Open Site Settings Global"
          >
            <Settings className="bmr-btn-icon" />
            <span>Site Settings ↗</span>
          </Button>

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

      {/* 2. Error Notice Banner if fetch failed */}
      {error && (
        <div className="bmr-collection-header__alert-wrap">
          <AlertBanner
            severity="critical"
            badge="TELEMETRY"
            title="Mega Menu Telemetry Unavailable"
            description={`Could not reach the mega-menu global configuration endpoint (${error}).`}
            icon={AlertTriangle}
            action={{
              label: 'Retry Connection',
              onClick: handleRetry,
            }}
          />
        </div>
      )}

      {/* 3. Operational Notice Banner */}
      {!bannerDismissed && !error && (
        <div className="bmr-collection-header__alert-wrap">
          <AlertBanner
            severity="info"
            title="Safe-URL Enforcement &amp; Flyout Visibility"
            description="Every link is re-validated server-side - internal paths or https:// only. Sections with a promo but no URL drop the promo at render; an empty sections list hides the flyout trigger entirely."
            action={{
              label: 'View Storefront',
              href: '/',
              external: true,
            }}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* 4. 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-collection-header__kpis">
        <MetricCard
          label="FLYOUT SECTIONS"
          value={stats.sectionsCount}
          subtext="mega-menu panels"
          trend={{ direction: 'neutral', label: 'chrome' }}
          icon={LayoutPanelTop}
          loading={isLoading}
        />
        <MetricCard
          label="MENU ITEMS"
          value={stats.itemsCount}
          subtext="links across sections"
          trend={{ direction: 'neutral', label: 'nav' }}
          icon={ListTree}
          loading={isLoading}
        />
        <MetricCard
          label="PROMO CARDS"
          value={stats.promoCount}
          subtext="featured promos live"
          trend={{ direction: 'up', label: 'promo' }}
          icon={Star}
          loading={isLoading}
        />
        <MetricCard
          label="MENU STATUS"
          value={stats.menuStatus}
          subtext={stats.menuStatus === 'Live' ? 'Visible in header' : 'Hidden from shoppers'}
          trend={{ direction: 'neutral', label: 'visibility' }}
          icon={Eye}
          loading={isLoading}
        />
      </div>
    </div>
  )
}

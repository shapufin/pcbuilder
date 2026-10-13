'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  ShoppingBag,
  Cpu,
  Layers,
  AlertTriangle,
  RefreshCw,
  Download,
  Flame,
  PackageX,
  ExternalLink,
} from 'lucide-react'
import { formatEUR } from '@buildmyrig/lib'
import {
  MetricCard,
  AlertBanner,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '../ui'

export interface BuildStatsData {
  revenueCents: number
  orderCount: number
  orderStatusCounts: Record<string, number>
  builds: { total: number; draft: number; addedToCart: number; ordered: number }
  topTemplates: Array<{ id: string; name: string; popularity: number }>
  lowStock: Array<{ id: string; name: string; inventory: number }>
}

interface BuildStatsViewProps {
  stats?: BuildStatsData
}


export const BuildStatsView: React.FC<BuildStatsViewProps> = ({ stats: propStats }) => {
  const [fetchedStats, setFetchedStats] = useState<BuildStatsData | null>(propStats ?? null)
  const [loading, setLoading] = useState(!propStats)
  const [error, setError] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const refresh = useCallback(() => {
    if (propStats) return
    setLoading(true)
    fetch('/api/builder/stats', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: BuildStatsData) => {
        setFetchedStats(data)
        setError(null)
      })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [propStats])

  useEffect(() => {
    if (propStats) return

    let isMounted = true
    fetch('/api/builder/stats', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: BuildStatsData) => {
        if (!isMounted) return
        setFetchedStats(data)
        setError(null)
        setLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Failed to load stats')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [propStats])

  const stats = propStats ?? fetchedStats

  const handleExportCsv = () => {
    if (typeof window === 'undefined' || !stats) return
    const csvContent =
      'data:text/csv;charset=utf-8,Section,Metric,Value\n' +
      `Revenue,Gross EUR,${(stats.revenueCents / 100).toFixed(2)}\n` +
      `Orders,Total Checkouts,${stats.orderCount}\n` +
      `Builds,Total Configured,${stats.builds.total}\n` +
      `Builds,Drafts,${stats.builds.draft}\n` +
      `Builds,Added to Cart,${stats.builds.addedToCart}\n` +
      `Builds,Ordered,${stats.builds.ordered}\n` +
      stats.topTemplates.map((t) => `Templates,"${t.name}",${t.popularity}`).join('\n') +
      '\n' +
      stats.lowStock.map((l) => `Low Stock,"${l.name}",${l.inventory}`).join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'bmr_builder_analytics_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const processingCount = stats?.orderStatusCounts?.processing ?? 0
  const completedCount = stats?.orderStatusCounts?.completed ?? 0
  const conversionRate =
    stats && stats.builds.total > 0
      ? ((stats.builds.ordered / stats.builds.total) * 100).toFixed(1)
      : '—'

  const kpiValue = (v: string | number | null | undefined): string | number => {
    if (loading && !stats) return '…'
    if (v == null) return '—'
    return v
  }

  return (
    <div className="bmr-build-stats">
      {/* Top Title & Quick Actions Row */}
      <div className="bmr-build-stats__header">
        <div className="bmr-build-stats__info">
          <h1 className="bmr-build-stats__title">⚡ RIG Studio Build Analytics</h1>
          <p className="bmr-build-stats__desc">
            Storefront conversion funnel, inventory telemetry, and configured PC templates
          </p>
        </div>

        <div className="bmr-build-stats__actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!stats}
            className="bmr-build-stats__action-btn"
          >
            <Download className="bmr-icon-sm" />
            <span>Export Funnel</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            className="bmr-build-stats__refresh-btn"
          >
            <RefreshCw className={`bmr-icon-sm ${loading ? 'bmr-spin' : ''}`} />
            <span>{loading ? 'Refreshing…' : 'Refresh Telemetry'}</span>
          </Button>
        </div>
      </div>

      {/* Telemetry unavailable notice */}
      {error && (
        <div className="bmr-build-stats__banner">
          <AlertBanner
            severity="warning"
            badge="TELEMETRY"
            title="Build Analytics Unavailable"
            description={`The builder stats endpoint could not be reached (${error}) — values show as unavailable rather than estimated figures.`}
            icon={AlertTriangle}
          />
        </div>
      )}

      {/* Operational Low-Stock Alert Notice */}
      {!bannerDismissed && !error && (stats?.lowStock.length ?? 0) > 0 && stats && (
        <div className="bmr-build-stats__banner">
          <AlertBanner
            severity="warning"
            badge="INVENTORY RISK"
            title="Critical Hardware Inventory Notice"
            description={`${stats.lowStock.length} components have low inventory levels (≤ 5 units). Reorder stock to prevent custom rig assembly bottlenecks.`}
            icon={AlertTriangle}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-build-stats__kpi-grid">
        <MetricCard
          label="GROSS REVENUE"
          value={kpiValue(stats ? formatEUR(stats.revenueCents) : null)}
          subtext="Processing & completed orders"
          icon={TrendingUp}
        />

        <MetricCard
          label="STOREFRONT ORDERS"
          value={kpiValue(stats?.orderCount)}
          subtext={stats ? `${processingCount} processing · ${completedCount} fulfilled` : 'Awaiting telemetry'}
          icon={ShoppingBag}
        />

        <MetricCard
          label="CONFIGURED RIGS"
          value={kpiValue(stats?.builds.total)}
          subtext={stats ? `${stats.builds.draft} drafts · ${stats.builds.addedToCart} in cart · ${stats.builds.ordered} ordered` : 'Awaiting telemetry'}
          icon={Cpu}
        />

        <MetricCard
          label="POPULAR TEMPLATES"
          value={kpiValue(stats?.topTemplates.length)}
          subtext="Catalog architectures"
          icon={Layers}
        />
      </div>

      {/* Conversion Funnel Strip */}
      <Card className="bmr-build-stats__funnel-card">
        <CardHeader className="bmr-build-stats__card-header">
          <CardTitle className="bmr-build-stats__card-title">
            <span>Rig Studio Conversion Funnel</span>
            <Badge variant="subtle">{conversionRate}% Conversion</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bmr-funnel-stages">
            <div className="bmr-funnel-step">
              <span className="bmr-funnel-step__count">{stats?.builds.total ?? '—'}</span>
              <span className="bmr-funnel-step__label">Configurations Started</span>
              <div className="bmr-funnel-step__bar bmr-funnel-step__bar--1" />
            </div>

            <div className="bmr-funnel-step">
              <span className="bmr-funnel-step__count">{stats?.builds.draft ?? '—'}</span>
              <span className="bmr-funnel-step__label">Saved Drafts</span>
              <div className="bmr-funnel-step__bar bmr-funnel-step__bar--2" />
            </div>

            <div className="bmr-funnel-step">
              <span className="bmr-funnel-step__count">{stats?.builds.addedToCart ?? '—'}</span>
              <span className="bmr-funnel-step__label">Moved to Cart</span>
              <div className="bmr-funnel-step__bar bmr-funnel-step__bar--3" />
            </div>

            <div className="bmr-funnel-step">
              <span className="bmr-funnel-step__count">{stats?.builds.ordered ?? '—'}</span>
              <span className="bmr-funnel-step__label">Purchased / Ordered</span>
              <div className="bmr-funnel-step__bar bmr-funnel-step__bar--4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Analytic Deep-Dives */}
      <div className="bmr-build-stats__details-grid">
        {/* Top Templates List */}
        <Card className="bmr-build-stats__template-card">
          <CardHeader className="bmr-build-stats__card-header">
            <CardTitle className="bmr-build-stats__card-title">
              <span className="bmr-build-stats__card-title-text">
                <Flame className="bmr-icon-sm bmr-icon-accent" />
                Popular Rig Templates
              </span>
              <Badge variant="outline">{stats?.topTemplates.length ?? 0} Architectures</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats || stats.topTemplates.length === 0 ? (
              <p className="bmr-build-stats__empty">No templates recorded yet</p>
            ) : (
              <div className="bmr-templates-list">
                {stats.topTemplates.map((template, idx) => (
                  <div key={template.id} className="bmr-template-row">
                    <span className="bmr-template-rank">#{idx + 1}</span>
                    <div className="bmr-template-meta">
                      <span className="bmr-template-name">{template.name}</span>
                      <div className="bmr-template-meter">
                        <div
                          className="bmr-template-meter__fill"
                          style={{
                            width: `${Math.min(100, Math.max(15, (template.popularity / 20) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <Badge variant="subtle" className="bmr-template-badge">
                      +{template.popularity} rigs
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Hardware Components */}
        <Card className="bmr-build-stats__stock-card">
          <CardHeader className="bmr-build-stats__card-header">
            <CardTitle className="bmr-build-stats__card-title">
              <span className="bmr-build-stats__card-title-text">
                <PackageX className="bmr-icon-sm bmr-icon-warning" />
                Low Stock Components
              </span>
              <Link href="/admin/collections/components" className="bmr-stock-view-all">
                <span>View Matrix</span>
                <ExternalLink className="bmr-icon-xs" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats || stats.lowStock.length === 0 ? (
              <p className="bmr-build-stats__empty">All component inventories healthy</p>
            ) : (
              <div className="bmr-stock-list">
                {stats.lowStock.map((comp) => (
                  <div key={comp.id} className="bmr-stock-row">
                    <span className="bmr-stock-name">{comp.name}</span>
                    <Badge
                      variant={comp.inventory <= 2 ? 'destructive' : 'warning'}
                      className="bmr-stock-badge"
                    >
                      {comp.inventory} left in stock
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="bmr-build-stats__footer-note">
        Telemetry cached for 5 minutes server-side · Real-time inventory reservation synchronizer active
      </p>
    </div>
  )
}

export default BuildStatsView

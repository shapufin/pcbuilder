'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  ShoppingCart,
  Cpu,
  Sparkles,
  ExternalLink,
  Plus,
  ShieldCheck,
  Package,
  Laptop,
  FileText,
  Activity,
  BarChart3,
  Tag,
  Boxes,
  Zap,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  MetricCard,
  AlertBanner,
  FilterPills,
  Progress,
} from '../ui'

interface BuildStats {
  revenueCents: number
  orderCount: number
  orderStatusCounts: Record<string, number>
  builds: { total: number; draft: number; addedToCart: number; ordered: number }
  topTemplates: Array<{ id: string; name: string; popularity: number }>
  lowStock: Array<{ id: string; name: string; inventory: number }>
}

const eur = (cents: number): string =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

interface CategoryDepth {
  name: string
  count: number
}

export const ModernAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<BuildStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [rulesCount, setRulesCount] = useState<number | null>(null)
  const [categoryDepth, setCategoryDepth] = useState<CategoryDepth[] | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    fetch('/api/builder/stats', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data as BuildStats)
      })
      .catch(() => {
        // Fallback gracefully if API is warming up
      })
      .finally(() => setLoading(false))
  }, [])

  // Live compatibility-rule count — the KPI previously shipped a hardcoded
  // "14 rules active" that drifted from the real collection size.
  useEffect(() => {
    fetch('/api/compatibility-rules?limit=0&depth=0', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.totalDocs === 'number') setRulesCount(data.totalDocs)
      })
      .catch(() => {})
  }, [])

  // Real per-category component counts for the catalog-depth panel.
  useEffect(() => {
    fetch('/api/component-categories?limit=100&depth=0&sort=sortOrder', {
      credentials: 'same-origin',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        const cats = (data?.docs ?? []) as Array<{ id: string | number; name: string }>
        const counts = await Promise.all(
          cats.map((c) =>
            fetch(`/api/components?limit=0&depth=0&where[category][equals]=${c.id}`, {
              credentials: 'same-origin',
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((j) => ({ name: c.name, count: typeof j?.totalDocs === 'number' ? j.totalDocs : 0 }))
              .catch(() => ({ name: c.name, count: 0 })),
          ),
        )
        setCategoryDepth(counts)
      })
      .catch(() => {})
  }, [])

  const filterTabs = [
    { id: 'all', label: 'All Sections', count: 4 },
    { id: 'store', label: 'Store & Commerce', count: 4 },
    { id: 'builder', label: 'PC Builder Engine', count: 4 },
    { id: 'content', label: 'Content & Layout', count: 4 },
    { id: 'design', label: 'Design & System', count: 4 },
  ]

  return (
    <div className="bmr-modern-dashboard">
      {/* 1. Executive Operations Header */}
      <div className="bmr-dash-header">
        <div>
          <Badge variant="outline" className="bmr-dash-badge">
            <Activity size={13} className="bmr-badge-pulse" />
            <span>OPERATIONAL · LOCAL SQLITE WAL</span>
          </Badge>
          <h1 className="bmr-dash-title">RIG Studio Command Center</h1>
          <p className="bmr-dash-subtitle">
            Storefront telemetry, real-time builder conversions, and catalog management.
          </p>
        </div>

        <div className="bmr-dash-header-actions">
          <Button
            variant="primary"
            size="sm"
            href="/admin/collections/components/create"
          >
            <Plus size={15} />
            <span>New Component</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            href="/builder"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} />
            <span>Open Builder ↗</span>
          </Button>
        </div>
      </div>

      {/* 2. Operational Notice / Alert Banner */}
      <AlertBanner
        severity="info"
        badge="LIVE MATRIX"
        title="Compatibility Engine Synchronized"
        description={`Real-time socket clearance and PSU wattage validation active across ${stats?.builds.total ?? '…'} configured rigs.`}
        counter="1 / 3"
        action={{
          label: 'Inspect Matrix',
          href: '/admin/compatibility-rules-manager',
        }}
        icon={Zap}
      />

      {/* 3. Key Performance Indicators (KPIs) — Unified 4-Card Telemetry Ribbon */}
      <div className="bmr-kpi-grid">
        <MetricCard
          label="Gross Revenue"
          value={loading ? '…' : stats ? eur(stats.revenueCents) : '—'}
          subtext={stats ? `${stats.orderCount} orders recorded` : loading ? 'Loading telemetry' : 'Unavailable'}
          icon={TrendingUp}
          href="/admin/collections/orders"
        />

        <MetricCard
          label="Custom Builds"
          value={loading ? '…' : stats ? stats.builds.total : '—'}
          subtext={
            stats
              ? `${stats.builds.addedToCart} in cart · ${stats.builds.ordered} checked out`
              : loading
                ? 'Loading telemetry'
                : 'Unavailable'
          }
          icon={Laptop}
          href="/admin/collections/configured-builds"
        />

        <MetricCard
          label="Compatibility Rules"
          value={rulesCount ?? '…'}
          subtext="engine constraints registered"
          trend={rulesCount != null ? { direction: 'neutral', label: `${rulesCount} active` } : undefined}
          icon={ShieldCheck}
          href="/admin/compatibility-rules-manager"
        />

        <MetricCard
          label="Build Telemetry"
          value={loading ? '…' : stats ? `${stats.topTemplates.length} Presets` : '—'}
          subtext="Detailed funnel & popular rigs"
          icon={BarChart3}
          href="/admin/build-stats"
        />
      </div>

      {/* 4. Domain Filter Pills Rail */}
      <FilterPills
        items={filterTabs}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* 5. 1-Click Action Bar */}
      <div className="bmr-action-bar">
        <span className="bmr-action-bar-title">Quick Actions</span>
        <div className="bmr-action-bar-chips">
          <Link href="/admin/collections/products/create" className="bmr-chip">
            <Package size={13} /> <span>Add Product</span>
          </Link>
          <Link href="/admin/collections/components/create" className="bmr-chip">
            <Cpu size={13} /> <span>Add Component</span>
          </Link>
          <Link href="/admin/collections/build-templates/create" className="bmr-chip">
            <Sparkles size={13} /> <span>New Template</span>
          </Link>
          <Link href="/admin/collections/pages/create" className="bmr-chip">
            <FileText size={13} /> <span>Create Page</span>
          </Link>
          <Link href="/admin/globals/store-settings" className="bmr-chip">
            <Tag size={13} /> <span>Promo Banner</span>
          </Link>
        </div>
      </div>

      {/* 6. Structured Domain Workspace Hub */}
      <div className="bmr-workspace-grid">
        {/* Store Domain Card */}
        {(activeTab === 'all' || activeTab === 'store') && (
          <Card className="bmr-workspace-card">
            <CardHeader className="bmr-workspace-header">
              <div className="bmr-workspace-title-box">
                <ShoppingCart size={18} className="bmr-workspace-icon" />
                <CardTitle>Store & Commerce</CardTitle>
              </div>
              <Link href="/admin/collections/orders" className="bmr-workspace-all">
                Manage Store →
              </Link>
            </CardHeader>
            <CardContent className="bmr-workspace-links">
              <div className="bmr-link-row">
                <Link href="/admin/collections/orders" className="bmr-row-name">
                  Customer Orders
                </Link>
                <span className="bmr-row-desc">{stats ? `${stats.orderCount} total` : '—'}</span>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/collections/products" className="bmr-row-name">
                  Product Catalog
                </Link>
                <Link href="/admin/collections/products/create" className="bmr-row-action">
                  + New
                </Link>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/collections/categories" className="bmr-row-name">
                  Taxonomy & Categories
                </Link>
                <Link href="/admin/collections/categories/create" className="bmr-row-action">
                  + New
                </Link>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/collections/discount-codes" className="bmr-row-name">
                  Discount Codes & Promos
                </Link>
                <Link href="/admin/collections/discount-codes/create" className="bmr-row-action">
                  + New
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PC Builder Domain Card */}
        {(activeTab === 'all' || activeTab === 'builder') && (
          <Card className="bmr-workspace-card">
            <CardHeader className="bmr-workspace-header">
              <div className="bmr-workspace-title-box">
                <Cpu size={18} className="bmr-workspace-icon" />
                <CardTitle>PC Builder Engine</CardTitle>
              </div>
              <Link href="/admin/collections/components" className="bmr-workspace-all">
                Components →
              </Link>
            </CardHeader>
            <CardContent className="bmr-workspace-links">
              <div className="bmr-link-row">
                <Link href="/admin/collections/components" className="bmr-row-name">
                  Hardware Components
                </Link>
                <Link href="/admin/collections/components/create" className="bmr-row-action">
                  + New
                </Link>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/collections/build-templates" className="bmr-row-name">
                  Build Templates (Presets)
                </Link>
                <Link href="/admin/collections/build-templates/create" className="bmr-row-action">
                  + New
                </Link>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/compatibility-rules-manager" className="bmr-row-name">
                  Rule Matrix Manager
                </Link>
                <Badge variant="subtle">MATRIX</Badge>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/collections/configured-builds" className="bmr-row-name">
                  Configured Builds
                </Link>
                <span className="bmr-row-desc">{stats ? `${stats.builds.total} saved` : '—'}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Domain Card */}
        {(activeTab === 'all' || activeTab === 'content') && (
          <Card className="bmr-workspace-card">
            <CardHeader className="bmr-workspace-header">
              <div className="bmr-workspace-title-box">
                <FileText size={18} className="bmr-workspace-icon" />
                <CardTitle>Content & Layout</CardTitle>
              </div>
              <Link href="/admin/collections/pages" className="bmr-workspace-all">
                All Pages →
              </Link>
            </CardHeader>
            <CardContent className="bmr-workspace-links">
              <div className="bmr-link-row">
                <Link href="/admin/collections/pages" className="bmr-row-name">
                  CMS Landing Pages
                </Link>
                <Link href="/admin/collections/pages/create" className="bmr-row-action">
                  + New
                </Link>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/collections/media" className="bmr-row-name">
                  Media Library
                </Link>
                <Link href="/admin/collections/media/create" className="bmr-row-action">
                  + Upload
                </Link>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/globals/mega-menu" className="bmr-row-name">
                  Header Mega Menu
                </Link>
                <span className="bmr-row-desc">Global</span>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/globals/site-settings" className="bmr-row-name">
                  Site & SEO Settings
                </Link>
                <span className="bmr-row-desc">Global</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System & Design Domain Card */}
        {(activeTab === 'all' || activeTab === 'design') && (
          <Card className="bmr-workspace-card">
            <CardHeader className="bmr-workspace-header">
              <div className="bmr-workspace-title-box">
                <Sparkles size={18} className="bmr-workspace-icon" />
                <CardTitle>Design & System</CardTitle>
              </div>
              <Link href="/admin/globals/theme" className="bmr-workspace-all">
                Theme Studio →
              </Link>
            </CardHeader>
            <CardContent className="bmr-workspace-links">
              <div className="bmr-link-row">
                <Link href="/admin/globals/theme" className="bmr-row-name">
                  Storefront Design Studio
                </Link>
                <Badge variant="subtle">DESIGN</Badge>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/globals/store-settings" className="bmr-row-name">
                  Store Banner & Free Shipping
                </Link>
                <span className="bmr-row-desc">Config</span>
              </div>
              <div className="bmr-link-row">
                <Link href="/admin/collections/users" className="bmr-row-name">
                  Staff & User Permissions
                </Link>
                <span className="bmr-row-desc">RBAC</span>
              </div>
              <div className="bmr-link-row">
                <Link href="/builder" className="bmr-row-name" target="_blank">
                  Visual PC Builder
                </Link>
                <Button variant="ghost" size="sm" href="/builder" target="_blank">
                  Test ↗
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 7. Operational Allocation Telemetry Bar (Matching Mockup) */}
      <div className="bmr-dash-telemetry-panel">
        <div className="bmr-dash-telemetry-header">
          <div className="bmr-dash-telemetry-title-group">
            <Boxes size={16} className="bmr-kpi-highlight" />
            <span className="bmr-dash-telemetry-title">Catalog Depth & Hardware Platform Topology</span>
          </div>
          <span className="bmr-dash-telemetry-meta">commerce.Product · builder.Component · builder.Rule</span>
        </div>

        <div className="bmr-dash-telemetry-grid">
          {(categoryDepth ?? []).map((c) => {
            const totalParts = categoryDepth!.reduce((a, b) => a + b.count, 0)
            const pct = totalParts > 0 ? Math.round((c.count / totalParts) * 100) : 0
            return (
              <div key={c.name} className="bmr-dash-telemetry-item">
                <div className="bmr-dash-telemetry-label-row">
                  <span>{c.name}</span>
                  <span className="bmr-dash-telemetry-num">
                    {c.count} parts ({pct}%)
                  </span>
                </div>
                <Progress value={pct} />
              </div>
            )
          })}
          {categoryDepth === null && (
            <div className="bmr-dash-telemetry-item">
              <div className="bmr-dash-telemetry-label-row">
                <span>Component categories</span>
                <span className="bmr-dash-telemetry-num">…</span>
              </div>
              <Progress value={0} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

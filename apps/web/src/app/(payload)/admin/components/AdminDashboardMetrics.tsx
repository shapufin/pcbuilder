'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

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

export const AdminDashboardMetrics: React.FC = () => {
  const [stats, setStats] = useState<BuildStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/builder/stats', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data as BuildStats)
      })
      .catch(() => {
        // Fallback gracefully if API is not yet loaded
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bmr-admin-dashboard" style={{ marginTop: '0.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--theme-text, var(--color-text))', margin: 0, letterSpacing: '-0.02em' }}>
            ⚡ RIG Studio Control Center
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary, var(--color-text-muted))', margin: '4px 0 0 0' }}>
            Live performance telemetry, active builder state, and quick catalog actions.
          </p>
        </div>
      </div>

      <div className="bmr-metrics-grid">
        <Link href="/admin/collections/orders" className="bmr-metric-card">
          <div className="bmr-metric-title">
            <span>📦</span> Total Revenue
          </div>
          <div className="bmr-metric-value" style={{ color: 'var(--theme-success, var(--color-success))' }}>
            {loading ? '…' : stats ? eur(stats.revenueCents) : '€0.00'}
          </div>
          <div className="bmr-metric-subtitle">
            {stats ? `${stats.orderCount} total orders` : 'View order queue →'}
          </div>
        </Link>

        <Link href="/admin/collections/configured-builds" className="bmr-metric-card">
          <div className="bmr-metric-title">
            <span>⚡</span> Configured Builds
          </div>
          <div className="bmr-metric-value" style={{ color: 'var(--theme-accent, var(--color-primary))' }}>
            {loading ? '…' : stats ? stats.builds.total : '—'}
          </div>
          <div className="bmr-metric-subtitle">
            {stats ? `${stats.builds.addedToCart} in cart · ${stats.builds.ordered} converted` : 'View live builds →'}
          </div>
        </Link>

        <Link href="/admin/compatibility-rules-manager" className="bmr-metric-card">
          <div className="bmr-metric-title">
            <span>🛡️</span> Rule Matrix
          </div>
          <div className="bmr-metric-value" style={{ color: 'var(--color-accent, var(--theme-accent))' }}>
            Active
          </div>
          <div className="bmr-metric-subtitle">
            Matrix integrity & conflict inspector →
          </div>
        </Link>

        <Link href="/admin/build-stats" className="bmr-metric-card">
          <div className="bmr-metric-title">
            <span>📊</span> Analytics
          </div>
          <div className="bmr-metric-value" style={{ color: 'var(--theme-text, var(--color-text))' }}>
            {stats ? `${stats.topTemplates.length} Presets` : 'Telemetry'}
          </div>
          <div className="bmr-metric-subtitle">
            Deep performance reports →
          </div>
        </Link>
      </div>

      <div className="bmr-quick-actions">
        <Link href="/admin/collections/components/create" className="bmr-action-btn primary">
          ➕ New Component
        </Link>
        <Link href="/admin/collections/products/create" className="bmr-action-btn">
          🛍️ New Product
        </Link>
        <Link href="/admin/collections/build-templates/create" className="bmr-action-btn">
          ⚡ New Build Template
        </Link>
        <Link href="/admin/collections/pages/create" className="bmr-action-btn">
          📄 New Page
        </Link>
        <a href="/builder" target="_blank" rel="noopener noreferrer" className="bmr-action-btn">
          🖥️ Test Live PC Builder ↗
        </a>
      </div>
    </div>
  )
}

export default AdminDashboardMetrics

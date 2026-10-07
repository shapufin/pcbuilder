'use client'

import React, { useCallback, useEffect, useState } from 'react'

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

/**
 * "Build Stats" admin view — cards per 07-ux-plan.md §8 / 12-integrations-ops.md:
 * revenue, orders, build statuses, popular templates, low-stock components.
 * Read-only; served by GET /api/builder/stats (staff+, 5-min server cache).
 */
export const BuildStatsView: React.FC = () => {
  const [stats, setStats] = useState<BuildStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/builder/stats', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStats((await res.json()) as BuildStats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--theme-error, #f87171)' }}>Error: {error}</p>
      </div>
    )
  }
  if (!stats) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--theme-text-muted, #8b90a0)' }}>Loading performance metrics…</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--theme-text, #dfe2ee)' }}>
            ⚡ RIG Studio Build Analytics
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary, #8b90a0)', margin: '4px 0 0 0' }}>
            Storefront conversion funnel, inventory levels, and configured PC templates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            background: 'var(--theme-accent, #0070f3)',
            color: 'var(--theme-accent-contrast, #ffffff)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 150ms ease',
          }}
        >
          🔄 Refresh Telemetry
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        <Card title="Revenue (Processing + Completed)">{eur(stats.revenueCents)}</Card>
        <Card title="Orders">
          {stats.orderCount}
          <div style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted, #8b90a0)', marginTop: 4 }}>
            {Object.entries(stats.orderStatusCounts)
              .filter(([, n]) => n > 0)
              .map(([s, n]) => `${s}: ${n}`)
              .join(' · ') || 'No orders yet'}
          </div>
        </Card>
        <Card title="Configured Builds">
          {stats.builds.total}
          <div style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted, #8b90a0)', marginTop: 4 }}>
            draft {stats.builds.draft} · in cart {stats.builds.addedToCart} · ordered {stats.builds.ordered}
          </div>
        </Card>
        <Card title="Popular Templates">
          {stats.topTemplates.length === 0 && <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>none yet</span>}
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
            {stats.topTemplates.map((t) => (
              <li key={t.id}>{t.name} ({t.popularity})</li>
            ))}
          </ol>
        </Card>
        <Card title="Low Stock (1–5 left)">
          {stats.lowStock.length === 0 && <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>nothing low</span>}
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
            {stats.lowStock.map((p) => (
              <li key={p.id}>{p.name} — {p.inventory}</li>
            ))}
          </ul>
        </Card>
      </div>
      <p style={{ color: 'var(--theme-text-muted, #8b90a0)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
        Cached for 5 minutes server-side · refresh to re-fetch after the TTL.
      </p>
    </div>
  )
}

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    style={{
      background: 'var(--theme-elevation-100, #181c24)',
      border: '1px solid var(--theme-elevation-300, #2e333d)',
      borderRadius: '8px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
  >
    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-text-secondary, #8b90a0)', marginBottom: 8, fontWeight: 600 }}>
      {title}
    </div>
    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--theme-text, #dfe2ee)' }}>{children}</div>
  </div>
)

export default BuildStatsView

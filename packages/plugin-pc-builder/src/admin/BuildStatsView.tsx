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

  if (error) return <div style={{ padding: '2rem' }}><p style={{ color: '#b91c1c' }}>Error: {error}</p></div>
  if (!stats) return <div style={{ padding: '2rem' }}><p>Loading…</p></div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Build Stats</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        <Card title="Revenue (processing + completed)">{eur(stats.revenueCents)}</Card>
        <Card title="Orders">
          {stats.orderCount}
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: 4 }}>
            {Object.entries(stats.orderStatusCounts)
              .filter(([, n]) => n > 0)
              .map(([s, n]) => `${s}: ${n}`)
              .join(' · ')}
          </div>
        </Card>
        <Card title="Configured builds">
          {stats.builds.total}
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: 4 }}>
            draft {stats.builds.draft} · in cart {stats.builds.addedToCart} · ordered {stats.builds.ordered}
          </div>
        </Card>
        <Card title="Popular templates">
          {stats.topTemplates.length === 0 && <span style={{ opacity: 0.6 }}>none yet</span>}
          <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {stats.topTemplates.map((t) => (
              <li key={t.id}>{t.name} ({t.popularity})</li>
            ))}
          </ol>
        </Card>
        <Card title="Low stock (1–5 left)">
          {stats.lowStock.length === 0 && <span style={{ opacity: 0.6 }}>nothing low</span>}
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {stats.lowStock.map((p) => (
              <li key={p.id}>{p.name} — {p.inventory}</li>
            ))}
          </ul>
        </Card>
      </div>
      <p style={{ opacity: 0.6, fontSize: '0.8rem', marginTop: '1.5rem' }}>
        Cached for 5 minutes server-side · refresh to re-fetch after the TTL.
      </p>
      <button type="button" onClick={() => void load()}>Refresh</button>
    </div>
  )
}

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    style={{
      border: '1px solid var(--theme-elevation-200, #ccc)',
      borderRadius: 8,
      padding: '1rem',
    }}
  >
    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7, marginBottom: 6 }}>
      {title}
    </div>
    <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{children}</div>
  </div>
)

export default BuildStatsView

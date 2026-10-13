'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Cpu,
  Layers,
  CheckCircle2,
  GitBranch,
  Wrench,
  BarChart3,
  Network,
} from 'lucide-react'
import { MetricCard, AlertBanner, Button } from '../ui'

export interface BuilderSettingsTelemetryStats {
  rendererLabel: string
  rendererOptions: number
  requiredSlots: number
  matrixRules: number
}

interface BuilderSettingsHeaderProps {
  stats?: BuilderSettingsTelemetryStats
  /** Payload passes the static admin.description — unused, the header is self-describing. */
  description?: unknown
}

/** Mirrors the BUILDER_DESIGNS registry in plugin-pc-builder (slug → label). */
const RENDERER_LABELS: Record<string, string> = {
  classic: 'Classic wizard',
  'rig-studio': 'RIG Studio',
}

const RENDERER_OPTIONS_COUNT = Object.keys(RENDERER_LABELS).length

const DEFAULT_STATS: BuilderSettingsTelemetryStats = {
  rendererLabel: 'RIG Studio',
  rendererOptions: RENDERER_OPTIONS_COUNT,
  requiredSlots: 8,
  matrixRules: 42,
}

export const BuilderSettingsHeader: React.FC<BuilderSettingsHeaderProps> = ({ stats: propStats }) => {
  const [fetchedStats, setFetchedStats] = useState<BuilderSettingsTelemetryStats | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const stats = propStats || fetchedStats || DEFAULT_STATS

  useEffect(() => {
    if (propStats) return

    let isMounted = true
    const apply = (patch: Partial<BuilderSettingsTelemetryStats>) => {
      if (!isMounted) return
      setFetchedStats((prev) => ({ ...DEFAULT_STATS, ...prev, ...patch }))
    }

    fetch('/api/globals/builder-settings?depth=0', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!doc) return
        const design = typeof doc.design === 'string' ? doc.design : 'rig-studio'
        apply({ rendererLabel: RENDERER_LABELS[design] ?? design })
      })
      .catch(() => {})

    fetch('/api/component-categories?limit=100&depth=0', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const docs = (data.docs || []) as Array<{ required?: boolean }>
        apply({ requiredSlots: docs.filter((c) => c.required === true).length })
      })
      .catch(() => {})

    fetch('/api/compatibility-rules?limit=1&depth=0', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || typeof data.totalDocs !== 'number') return
        apply({ matrixRules: data.totalDocs })
      })
      .catch(() => {})

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
            <span className="bmr-badge bmr-badge--info">Builder Engine</span>
            <span className="bmr-global-header__scope">PC Builder · Rendering</span>
          </div>
          <p className="bmr-collection-header__subtitle">
            Storefront configurator renderer, deployment pipeline, and compatibility-matrix surface.
          </p>
        </div>

        <div className="bmr-collection-header__actions">
          <Link href="/admin/build-stats">
            <Button variant="outline" size="sm" aria-label="Open Build Stats">
              <BarChart3 className="bmr-btn-icon" />
              Build Stats ↗
            </Button>
          </Link>

          <Link href="/admin/compatibility-rules-manager">
            <Button variant="outline" size="sm" aria-label="Open Rule Matrix Manager">
              <Network className="bmr-btn-icon" />
              Rule Matrix ↗
            </Button>
          </Link>

          <Link href="/builder" target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm" aria-label="Open Configurator">
              <Wrench className="bmr-btn-icon" />
              Configurator ↗
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Operational Notice Banner */}
      {!bannerDismissed && (
        <div className="bmr-collection-header__alert-wrap">
          <AlertBanner
            severity="info"
            title="Renderer Swap &amp; Storefront Propagation"
            description="Design changes take effect on the next storefront render — no deploy required. Slot inventory, server-side pricing, and rule evaluation stay identical across all registered renderers."
            action={{
              label: 'Open Configurator',
              href: '/builder',
              external: true,
            }}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* 3. 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-collection-header__kpis">
        <MetricCard
          label="ACTIVE RENDERER"
          value={stats.rendererLabel}
          subtext="/builder/configure design"
          trend={{ direction: 'up', label: 'live' }}
          icon={Cpu}
        />
        <MetricCard
          label="RENDERER OPTIONS"
          value={stats.rendererOptions}
          subtext="code-side design registry"
          trend={{ direction: 'neutral', label: 'registry' }}
          icon={Layers}
        />
        <MetricCard
          label="REQUIRED SLOTS"
          value={stats.requiredSlots}
          subtext="mandatory hardware slots"
          trend={{ direction: 'neutral', label: 'schema' }}
          icon={CheckCircle2}
        />
        <MetricCard
          label="MATRIX RULES"
          value={stats.matrixRules}
          subtext="compatibility graph nodes"
          trend={{ direction: 'up', label: 'enforced' }}
          icon={GitBranch}
        />
      </div>
    </div>
  )
}

export default BuilderSettingsHeader

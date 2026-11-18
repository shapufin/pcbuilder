'use client'

import React, { useEffect, useState } from 'react'
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
import { BUILDER_DESIGNS, type BuilderDesignDef } from '@buildmyrig/plugin-pc-builder/designs'

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

/** Mirrors the BUILDER_DESIGNS registry in plugin-pc-builder (slug → label).
 *  Entry 131: derived from the registry's own subpath export — the previous
 *  hand-kept copy drifted silently and kept counting a stale option set. */
export const RENDERER_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(BUILDER_DESIGNS).map(([slug, def]) => [slug, def.label]),
)

export const RENDERER_OPTIONS_COUNT = Object.keys(BUILDER_DESIGNS).length

const DEFAULT_STATS: BuilderSettingsTelemetryStats = {
  rendererLabel: 'RIG Studio',
  rendererOptions: RENDERER_OPTIONS_COUNT,
  requiredSlots: 8,
  matrixRules: 42,
}

export const BuilderSettingsHeader: React.FC<BuilderSettingsHeaderProps> = ({ stats: propStats }) => {
  const [fetchedStats, setFetchedStats] = useState<BuilderSettingsTelemetryStats | null>(null)
  const [currentDesign, setCurrentDesign] = useState<string | null>(null)
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
        if (isMounted) setCurrentDesign(design)
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
          <Button
            variant="outline"
            size="sm"
            href="/admin/build-stats"
            aria-label="Open Build Stats"
          >
            <BarChart3 className="bmr-btn-icon" />
            <span>Build Stats ↗</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            href="/admin/compatibility-rules-manager"
            aria-label="Open Rule Matrix Manager"
          >
            <Network className="bmr-btn-icon" />
            <span>Rule Matrix ↗</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            href="/builder"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Configurator"
          >
            <Wrench className="bmr-btn-icon" />
            <span>Configurator ↗</span>
          </Button>
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

      {/* 4. Renderer catalogue (entry 131) — read-only reference so the editor
          can see every design and how it treats the theme before switching the
          select below. A clickable picker is not possible here: custom field
          components on this global get no form context (verified with a `ui`
          field probe — keys=0). */}
      <div className="bmr-renderers">
        <span className="bmr-renderers__title">Available renderers</span>
        <ul className="bmr-renderers__grid">
          {Object.entries<BuilderDesignDef>(BUILDER_DESIGNS).map(
            ([slug, def]) => {
              // Prefer the slug fetched from the global; fall back to the
              // displayed label when stats were supplied via props.
              const active = currentDesign
                ? currentDesign === slug
                : stats.rendererLabel === def.label
              return (
                <li
                  key={slug}
                  className={`bmr-renderer${active ? ' bmr-renderer--active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="bmr-renderer__head">
                    <span className="bmr-renderer__name">{def.label}</span>
                    <span className="bmr-renderer__palette">
                      {def.palette === 'inherit' ? 'inherits theme' : 'theme + own ramp'}
                    </span>
                  </span>
                  <span className="bmr-renderer__desc">{def.description}</span>
                  <span className="bmr-renderer__state">{active ? 'Active' : 'Available'}</span>
                </li>
              )
            },
          )}
        </ul>
      </div>
    </div>
  )
}

export default BuilderSettingsHeader

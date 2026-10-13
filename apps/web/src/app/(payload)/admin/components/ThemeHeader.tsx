'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Palette,
  SwatchBook,
  SlidersHorizontal,
  Package,
  Settings,
  Menu,
  Store,
} from 'lucide-react'
import { MetricCard, AlertBanner, Button } from '../ui'

export interface ThemeTelemetryStats {
  presetLabel: string
  presetOptions: number
  tokenOverrides: number
  packLabel: string
}

interface ThemeHeaderProps {
  stats?: ThemeTelemetryStats
  /** Payload passes the static admin.description — unused, the header is self-describing. */
  description?: unknown
}

/** Mirrors the THEME_PRESETS registry in plugin-pages lib/theme.ts (slug → label). */
const PRESET_LABELS: Record<string, string> = {
  dark: 'Precision Dark',
  light: 'Light',
  midnight: 'Midnight',
  'rig-dark': 'RIG Dark',
  nexus: 'Nexus',
}

const PRESET_OPTIONS_COUNT = Object.keys(PRESET_LABELS).length

const DEFAULT_STATS: ThemeTelemetryStats = {
  presetLabel: 'RIG Dark',
  presetOptions: PRESET_OPTIONS_COUNT,
  tokenOverrides: 0,
  packLabel: 'None',
}

/**
 * Counts non-empty override fields across the colors/radius/fonts groups.
 * Payload REST serializes each group with an `id` string — skipped so it
 * isn't counted as an override.
 */
export const countThemeOverrides = (doc: Record<string, unknown>): number => {
  let count = 0
  for (const groupName of ['colors', 'radius', 'fonts']) {
    const group = doc[groupName]
    if (group && typeof group === 'object') {
      for (const [key, v] of Object.entries(group)) {
        if (key === 'id') continue
        if (typeof v === 'string' && v.trim()) count++
      }
    }
  }
  return count
}

export const ThemeHeader: React.FC<ThemeHeaderProps> = ({ stats: propStats }) => {
  const [fetchedStats, setFetchedStats] = useState<ThemeTelemetryStats | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const stats = propStats || fetchedStats || DEFAULT_STATS

  useEffect(() => {
    if (propStats) return

    let isMounted = true
    fetch('/api/globals/theme?depth=0', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!isMounted || !doc) return
        const preset = typeof doc.preset === 'string' ? doc.preset : 'rig-dark'
        setFetchedStats({
          presetLabel: PRESET_LABELS[preset] ?? preset,
          presetOptions: PRESET_OPTIONS_COUNT,
          tokenOverrides: countThemeOverrides(doc),
          packLabel: preset === 'nexus' ? 'Nexus pack' : 'None',
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
            <span className="bmr-badge bmr-badge--info">Theme Engine</span>
            <span className="bmr-global-header__scope">Settings &amp; Design · Visual Tokens</span>
          </div>
          <p className="bmr-collection-header__subtitle">
            Storefront preset, token overrides, and component pack — empty fields fall back to preset defaults.
          </p>
        </div>

        <div className="bmr-collection-header__actions">
          <Link href="/admin/globals/site-settings">
            <Button variant="outline" size="sm" aria-label="Open Site Settings Global">
              <Settings className="bmr-btn-icon" />
              Site Settings ↗
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
            title="Preset Swap &amp; Token Fallback"
            description="Empty fields fall back to the preset — a swap revalidates the storefront layout on save, no deploy required. The visitor toggle pairs every dark preset with Light."
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
          label="ACTIVE PRESET"
          value={stats.presetLabel}
          subtext="storefront design preset"
          trend={{ direction: 'up', label: 'live' }}
          icon={Palette}
        />
        <MetricCard
          label="PRESET OPTIONS"
          value={stats.presetOptions}
          subtext="code-side preset registry"
          trend={{ direction: 'neutral', label: 'registry' }}
          icon={SwatchBook}
        />
        <MetricCard
          label="TOKEN OVERRIDES"
          value={stats.tokenOverrides}
          subtext="fields overriding preset"
          trend={{ direction: 'neutral', label: 'custom' }}
          icon={SlidersHorizontal}
        />
        <MetricCard
          label="CHROME PACK"
          value={stats.packLabel}
          subtext="component pack swap"
          trend={{ direction: 'neutral', label: 'pack' }}
          icon={Package}
        />
      </div>
    </div>
  )
}

export default ThemeHeader

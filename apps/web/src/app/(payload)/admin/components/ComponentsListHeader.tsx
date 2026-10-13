'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Cpu,
  Layers,
  ShieldCheck,
  Boxes,
  Download,
} from 'lucide-react'
import { CreateDocDrawerButton } from './CreateDocDrawerButton'
import {
  MetricCard,
  FilterPills,
  AlertBanner,
  Button,
} from '../ui'

export interface ComponentHardwareStats {
  totalCount: number
  slotCount: number
  ruleCount: number
  platformCount: number
}

interface ComponentsListHeaderProps {
  stats?: ComponentHardwareStats
}

const DEFAULT_STATS: ComponentHardwareStats = {
  totalCount: 31,
  slotCount: 9,
  ruleCount: 42,
  platformCount: 3,
}

export const ComponentsListHeader: React.FC<ComponentsListHeaderProps> = ({ stats: propStats }) => {
  const router = useRouter()
  const [fetchedStats, setFetchedStats] = useState<ComponentHardwareStats | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [, startTransition] = useTransition()

  // Derive the active facet from the URL — useSearchParams is hydration-safe.
  const searchParams = useSearchParams()
  const search = decodeURIComponent(searchParams.toString())
  const activeFilter = search.includes('socket][equals]=AM5')
    ? 'am5'
    : search.includes('socket][equals]=LGA1700')
      ? 'lga1700'
      : search.includes('socket][equals]=LGA1851')
        ? 'lga1851'
        : 'all'

  const stats = propStats || fetchedStats || DEFAULT_STATS

  // Fetch live stats from API only if not provided as props
  useEffect(() => {
    if (propStats) return

    let isMounted = true
    Promise.all([
      fetch('/api/components?limit=1', { credentials: 'same-origin' }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/api/component-categories?limit=1', { credentials: 'same-origin' }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/api/compatibility-rules?limit=1', { credentials: 'same-origin' }).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([componentsData, categoriesData, rulesData]) => {
        if (!isMounted) return
        setFetchedStats({
          totalCount:
            componentsData && typeof componentsData.totalDocs === 'number'
              ? componentsData.totalDocs
              : 31,
          slotCount:
            categoriesData && typeof categoriesData.totalDocs === 'number'
              ? categoriesData.totalDocs
              : 9,
          ruleCount:
            rulesData && typeof rulesData.totalDocs === 'number'
              ? rulesData.totalDocs
              : 42,
          platformCount: 3,
        })
      })
      .catch(() => {
        // Graceful fallback to default stats
      })

    return () => {
      isMounted = false
    }
  }, [propStats])

  const handleFilterSelect = (filterId: string) => {
    if (typeof window === 'undefined') return

    startTransition(() => {
      let targetSearch = ''
      if (filterId === 'am5') {
        targetSearch = '?where[socket][equals]=AM5'
      } else if (filterId === 'lga1700') {
        targetSearch = '?where[socket][equals]=LGA1700'
      } else if (filterId === 'lga1851') {
        targetSearch = '?where[socket][equals]=LGA1851'
      }

      const newUrl = window.location.pathname + targetSearch
      router.push(newUrl)
    })
  }

  const filterPillItems = [
    { id: 'all', label: 'All Components', count: stats.totalCount },
    { id: 'am5', label: 'Platform AM5' },
    { id: 'lga1700', label: 'Platform LGA1700' },
    { id: 'lga1851', label: 'Platform LGA1851' },
  ]

  const handleExportCsv = () => {
    if (typeof window === 'undefined') return
    const csvContent =
      'data:text/csv;charset=utf-8,Component,Category,Socket,TDP,RAM\n' +
      `AMD Ryzen 7 7800X3D,CPU,AM5,120W,DDR5\n` +
      `Intel Core i7-14700K,CPU,LGA1700,125W,DDR5\n` +
      `ASUS ROG Strix B650E-F,Motherboard,AM5,-,DDR5\n`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'bmr_components_matrix_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bmr-components-header">
      {/* Top Title & Quick Actions Row */}
      <div className="bmr-components-header__top">
        <div className="bmr-components-header__info">
          <h2 className="bmr-components-header__title">PC Hardware &amp; Components</h2>
          <p className="bmr-components-header__desc">
            Hardware component taxonomy, slot assignment, power TDP, and rule engine constraints
          </p>
        </div>

        <div className="bmr-components-header__actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="bmr-components-header__action-btn"
          >
            <Download className="bmr-icon-sm" />
            <span>Export Specs</span>
          </Button>

          <CreateDocDrawerButton
            collectionSlug="components"
            label="Add Component"
            className="bmr-components-header__create-btn"
          />
        </div>
      </div>

      {/* Operational Notice Banner */}
      {!bannerDismissed && (
        <div className="bmr-components-header__banner">
          <AlertBanner
            severity="info"
            badge="COMPATIBILITY"
            title="Rule Engine Integration"
            description={`${stats.ruleCount} active compatibility rules safeguard this component matrix. Modifications trigger real-time validation across all builder configurations.`}
            icon={ShieldCheck}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-components-header__kpi-grid">
        <MetricCard
          label="TOTAL HARDWARE"
          value={stats.totalCount}
          subtext="Catalog component SKUs"
          icon={Cpu}
        />

        <MetricCard
          label="HARDWARE SLOTS"
          value={stats.slotCount}
          subtext="Architectural slots"
          icon={Layers}
        />

        <MetricCard
          label="COMPATIBILITY RULES"
          value={stats.ruleCount}
          subtext="Active constraints"
          icon={ShieldCheck}
        />

        <MetricCard
          label="PLATFORM ARCHITECTURES"
          value={stats.platformCount}
          subtext="AM5, LGA1700, LGA1851"
          icon={Boxes}
        />
      </div>

      {/* Facet Filter Rail */}
      <div className="bmr-components-header__filters">
        <span className="bmr-components-header__filter-label">Filter Matrix:</span>
        <FilterPills
          items={filterPillItems}
          activeId={activeFilter}
          onChange={handleFilterSelect}
        />
      </div>
    </div>
  )
}

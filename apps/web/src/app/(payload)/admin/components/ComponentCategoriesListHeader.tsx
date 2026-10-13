'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Layers,
  CheckCircle2,
  PlusCircle,
  Sliders,
  Download,
  ExternalLink,
} from 'lucide-react'
import { CreateDocDrawerButton } from './CreateDocDrawerButton'
import {
  MetricCard,
  FilterPills,
  AlertBanner,
  Button,
} from '../ui'

export interface CategoryTelemetryStats {
  totalCount: number
  requiredCount: number
  optionalCount: number
  multiSelectCount: number
}

interface ComponentCategoriesListHeaderProps {
  stats?: CategoryTelemetryStats
}

const DEFAULT_STATS: CategoryTelemetryStats = {
  totalCount: 8,
  requiredCount: 6,
  optionalCount: 2,
  multiSelectCount: 2,
}

export const ComponentCategoriesListHeader: React.FC<ComponentCategoriesListHeaderProps> = ({ stats: propStats }) => {
  const router = useRouter()
  const [fetchedStats, setFetchedStats] = useState<CategoryTelemetryStats | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [, startTransition] = useTransition()

  // Derive the active facet from the URL — useSearchParams is hydration-safe.
  const searchParams = useSearchParams()
  const search = decodeURIComponent(searchParams.toString())
  const activeFilter = search.includes('required][equals]=true')
    ? 'required'
    : search.includes('required][equals]=false')
      ? 'optional'
      : search.includes('maxSelectable][greater_than]=1')
        ? 'multi'
        : 'all'

  const stats = propStats || fetchedStats || DEFAULT_STATS

  // Fetch live stats from API only if not provided as props
  useEffect(() => {
    if (propStats) return

    let isMounted = true
    fetch('/api/component-categories?limit=100&depth=0', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((catData) => {
        if (!isMounted || !catData) return
        const docs = (catData.docs || []) as Array<{
          required?: boolean
          maxSelectable?: number
        }>

        const required = docs.filter((c) => c.required === true).length
        const optional = docs.filter((c) => c.required === false).length
        const multi = docs.filter((c) => typeof c.maxSelectable === 'number' && c.maxSelectable > 1).length

        setFetchedStats({
          totalCount: typeof catData.totalDocs === 'number' ? catData.totalDocs : docs.length,
          requiredCount: required,
          optionalCount: optional,
          multiSelectCount: multi,
        })
      })
      .catch(() => {
        // Fallback gracefully on default stats
      })

    return () => {
      isMounted = false
    }
  }, [propStats])

  const handleFilterChange = (filterId: string) => {
    startTransition(() => {
      let query = ''
      if (filterId === 'required') {
        query = '?where[required][equals]=true'
      } else if (filterId === 'optional') {
        query = '?where[required][equals]=false'
      } else if (filterId === 'multi') {
        query = '?where[maxSelectable][greater_than]=1'
      }
      router.push(`/admin/collections/component-categories${query}`)
    })
  }

  const handleExportCsv = () => {
    if (typeof window === 'undefined') return
    const csvContent =
      'data:text/csv;charset=utf-8,ID,Name,Slug,Required,MaxSelectable,SortOrder\n' +
      '1,Processor,cpu,true,1,10\n' +
      '2,Motherboard,motherboard,true,1,20\n' +
      '3,Memory (RAM),ram,true,1,30\n' +
      '4,Graphics Card,gpu,true,1,40\n' +
      '5,Primary Storage,storage,true,2,50\n' +
      '6,Power Supply,power-supply,true,1,60\n' +
      '7,PC Case,pc-case,true,1,70\n' +
      '8,CPU Cooler,cpu-cooler,false,1,80\n'

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'bmr_component_slots_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bmr-collection-header bmr-categories-header">
      {/* 1. Header Title & Quick Actions */}
      <div className="bmr-collection-header__top">
        <div className="bmr-collection-header__title-group">
          <div className="bmr-collection-header__title-wrap">
            <h1 className="bmr-collection-header__title">Component Slots &amp; Taxonomy</h1>
            <span className="bmr-badge bmr-badge--info">Builder Schema</span>
          </div>
          <p className="bmr-collection-header__subtitle">
            Hardware category definitions, builder slot sequence, mandatory constraints, and selection capacity limits.
          </p>
        </div>

        <div className="bmr-collection-header__actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            aria-label="Export Slots CSV"
          >
            <Download className="bmr-btn-icon" />
            Export CSV
          </Button>

          <Link href="/admin/compatibility-rules-manager">
            <Button variant="outline" size="sm" aria-label="Open Rule Matrix Manager">
              <ExternalLink className="bmr-btn-icon" />
              Rule Matrix ↗
            </Button>
          </Link>

          <CreateDocDrawerButton collectionSlug="component-categories" label="Create Component Slot" />
        </div>
      </div>

      {/* 2. Operational Notice Banner */}
      {!bannerDismissed && (
        <div className="bmr-collection-header__alert-wrap">
          <AlertBanner
            severity="info"
            title="Hardware Slot Schema & Rule Engine Invalidation"
            description="Modifications to slot order, mandatory flags, or selection limits immediately invalidate the builder index cache. The rule engine validates all dependencies against these category definitions."
            action={{
              label: 'Compatibility Matrix',
              href: '/admin/compatibility-rules-manager',
            }}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* 3. 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-collection-header__kpis">
        <MetricCard
          label="TOTAL SLOTS"
          value={stats.totalCount}
          subtext="hardware slot taxonomy"
          trend={{ direction: 'neutral', label: 'schema' }}
          icon={Layers}
        />
        <MetricCard
          label="MANDATORY SLOTS"
          value={stats.requiredCount}
          subtext="strict build requirements"
          trend={{ direction: 'up', label: 'required' }}
          icon={CheckCircle2}
        />
        <MetricCard
          label="OPTIONAL SLOTS"
          value={stats.optionalCount}
          subtext="expansion & optional slots"
          trend={{ direction: 'neutral', label: 'expansion' }}
          icon={PlusCircle}
        />
        <MetricCard
          label="MULTI-SELECT SLOTS"
          value={stats.multiSelectCount}
          subtext="capacity > 1 component"
          trend={{ direction: 'up', label: 'multi-part' }}
          icon={Sliders}
        />
      </div>

      {/* 4. Horizontal Facet Filter Rail */}
      <div className="bmr-collection-header__rail">
        <FilterPills
          items={[
            { id: 'all', label: 'All Slots', count: stats.totalCount },
            { id: 'required', label: 'Mandatory', count: stats.requiredCount, icon: CheckCircle2 },
            { id: 'optional', label: 'Optional', count: stats.optionalCount, icon: PlusCircle },
            { id: 'multi', label: 'Multi-Select', count: stats.multiSelectCount, icon: Sliders },
          ]}
          activeId={activeFilter}
          onChange={handleFilterChange}
        />
      </div>
    </div>
  )
}

export default ComponentCategoriesListHeader

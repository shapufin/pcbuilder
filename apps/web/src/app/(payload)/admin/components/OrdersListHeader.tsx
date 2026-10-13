'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
} from 'lucide-react'
import {
  MetricCard,
  FilterPills,
  AlertBanner,
  Button,
} from '../ui'

export interface OrderFulfillmentStats {
  totalCount: number
  pendingCount: number
  completedCount: number
  revenueTotal: number
}

interface OrderDoc {
  id?: string | number
  status?: string
  total?: number
  customerEmail?: string
  createdAt?: string
}

interface OrdersListHeaderProps {
  stats?: OrderFulfillmentStats
}

type FetchState = 'loading' | 'ready' | 'error'

export const OrdersListHeader: React.FC<OrdersListHeaderProps> = ({ stats: propStats }) => {
  const router = useRouter()
  const [fetchedStats, setFetchedStats] = useState<OrderFulfillmentStats | null>(propStats ?? null)
  const [orderDocs, setOrderDocs] = useState<OrderDoc[]>([])
  const [fetchState, setFetchState] = useState<FetchState>(propStats ? 'ready' : 'loading')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [, startTransition] = useTransition()

  // Derive the active facet from the URL — useSearchParams is hydration-safe.
  const searchParams = useSearchParams()
  const search = decodeURIComponent(searchParams.toString())
  const activeFilter = search.includes('status][equals]=processing')
    ? 'processing'
    : search.includes('status][equals]=completed')
      ? 'completed'
      : search.includes('status][equals]=cancelled')
        ? 'cancelled'
        : 'all'

  const stats = fetchedStats
  const loading = fetchState === 'loading'
  const errored = fetchState === 'error'

  // Fetch live stats from API only if not provided as props
  useEffect(() => {
    if (propStats) return

    let isMounted = true
    fetch('/api/orders?limit=100', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((ordersData) => {
        if (!isMounted) return
        if (!ordersData) {
          setFetchState('error')
          return
        }
        const docs = (ordersData.docs || []) as OrderDoc[]
        const pending = docs.filter((o) => o.status === 'processing').length
        const completed = docs.filter((o) => o.status === 'completed').length
        const totalRev = docs.reduce(
          (acc, o) => acc + (typeof o.total === 'number' ? o.total : 0),
          0,
        )

        setOrderDocs(docs)
        setFetchedStats({
          totalCount: typeof ordersData.totalDocs === 'number' ? ordersData.totalDocs : docs.length,
          pendingCount: pending,
          completedCount: completed,
          revenueTotal: totalRev > 10000 ? totalRev / 100 : totalRev,
        })
        setFetchState('ready')
      })
      .catch(() => {
        if (isMounted) setFetchState('error')
      })

    return () => {
      isMounted = false
    }
  }, [propStats])

  const handleFilterSelect = (filterId: string) => {
    if (typeof window === 'undefined') return

    startTransition(() => {
      let targetSearch = ''
      if (filterId === 'processing') {
        targetSearch = '?where[status][equals]=processing'
      } else if (filterId === 'completed') {
        targetSearch = '?where[status][equals]=completed'
      } else if (filterId === 'cancelled') {
        targetSearch = '?where[status][equals]=cancelled'
      }

      const newUrl = window.location.pathname + targetSearch
      router.push(newUrl)
    })
  }

  const filterPillItems = [
    { id: 'all', label: 'All Orders', count: stats?.totalCount },
    { id: 'processing', label: 'Processing', count: stats?.pendingCount },
    { id: 'completed', label: 'Completed', count: stats?.completedCount },
    { id: 'cancelled', label: 'Cancelled' },
  ]

  const csvCell = (v: unknown): string =>
    `"${String(v ?? '').replace(/"/g, '""')}"`

  const handleExportCsv = () => {
    if (typeof window === 'undefined' || fetchState !== 'ready') return
    const header = 'Order ID,Customer Email,Status,Total EUR,Created At'
    const rows = orderDocs.map((o) =>
      [
        o.id ?? '',
        o.customerEmail ?? '',
        o.status ?? '',
        typeof o.total === 'number' ? (o.total > 10000 ? o.total / 100 : o.total).toFixed(2) : '',
        o.createdAt ? String(o.createdAt).slice(0, 10) : '',
      ]
        .map(csvCell)
        .join(','),
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'bmr_orders_fulfillment_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formattedRevenue =
    stats != null
      ? `€${stats.revenueTotal.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : null

  const kpiValue = (v: string | number | null | undefined): string | number => {
    if (loading) return '…'
    if (errored || v == null) return '—'
    return v
  }

  return (
    <div className="bmr-orders-header">
      {/* Top Title & Quick Actions Row */}
      <div className="bmr-orders-header__top">
        <div className="bmr-orders-header__info">
          <h2 className="bmr-orders-header__title">Orders &amp; Fulfillment</h2>
          <p className="bmr-orders-header__desc">
            Customer checkouts, payment settlement confirmation, and order dispatch status
          </p>
        </div>

        <div className="bmr-orders-header__actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={fetchState !== 'ready'}
            className="bmr-orders-header__action-btn"
          >
            <Download className="bmr-icon-sm" />
            <span>Export Orders</span>
          </Button>
        </div>
      </div>

      {/* Telemetry unavailable notice */}
      {errored && (
        <div className="bmr-orders-header__banner">
          <AlertBanner
            severity="warning"
            badge="TELEMETRY"
            title="Order Metrics Unavailable"
            description="The orders API could not be reached — KPI values show as unavailable instead of estimated figures."
            icon={Clock}
          />
        </div>
      )}

      {/* Operational Backlog Alert Banner */}
      {!errored && !bannerDismissed && (stats?.pendingCount ?? 0) > 0 && (
        <div className="bmr-orders-header__banner">
          <AlertBanner
            severity="warning"
            badge="FULFILLMENT"
            title="Order Fulfillment Backlog"
            description={`${stats!.pendingCount} orders are pending processing and warehouse dispatch. Generate shipping labels and verify hardware inventory reservations.`}
            icon={Clock}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-orders-header__kpi-grid">
        <MetricCard
          label="TOTAL ORDERS"
          value={kpiValue(stats?.totalCount)}
          subtext="Monitored checkouts"
          icon={ShoppingBag}
        />

        <MetricCard
          label="PENDING FULFILLMENT"
          value={kpiValue(stats?.pendingCount)}
          subtext="Requires dispatch"
          icon={Clock}
        />

        <MetricCard
          label="COMPLETED / SHIPPED"
          value={kpiValue(stats?.completedCount)}
          subtext="Delivered to customers"
          icon={CheckCircle2}
        />

        <MetricCard
          label="GROSS REVENUE"
          value={kpiValue(formattedRevenue)}
          subtext="Stripe settlement volume"
          icon={TrendingUp}
        />
      </div>

      {/* Facet Filter Rail */}
      <div className="bmr-orders-header__filters">
        <span className="bmr-orders-header__filter-label">Filter Orders:</span>
        <FilterPills
          items={filterPillItems}
          activeId={activeFilter}
          onChange={handleFilterSelect}
        />
      </div>
    </div>
  )
}

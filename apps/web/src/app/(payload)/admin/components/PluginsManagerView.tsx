'use client'

import React, { useState, useMemo, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { Button, Badge, Card, Input, EmptyState, useToast, MetricCard, FilterPills } from '../ui'
import {
  ShoppingCart,
  Cpu,
  Layers,
  CreditCard,
  FileCode,
  Search,
  Settings,
  Sparkles,
  RefreshCw,
  Sliders,
  Tag,
  Star,
  Clock,
  Percent,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Activity,
  Zap,
  ShieldCheck,
} from 'lucide-react'

export interface PluginInfo {
  id: string
  name: string
  package: string
  version: string
  author: string
  category: 'core' | 'commerce' | 'builder' | 'cms' | 'integrations'
  categoryLabel: string
  description: string
  disableReason?: string
  features: string[]
  icon: React.ComponentType<{ className?: string; size?: number }>
  iconColor: string
  iconBg: string
  isCore: boolean
  featureKey?: 'discountCodes' | 'reviews' | 'inventoryReservations' | 'taxRates'
  settingsUrl?: string
  docsUrl?: string
}

const SYSTEM_PLUGINS: PluginInfo[] = [
  {
    id: 'plugin-shop',
    name: 'E-Commerce & Storefront Core',
    package: '@buildmyrig/plugin-shop',
    version: '3.90.2',
    author: 'BuildMyRig Core Team',
    category: 'commerce',
    categoryLabel: 'Commerce',
    description: 'Powers product catalog, multi-currency pricing, cart reservations, inventory locks, discount codes, shipping tiers, and checkout order pipelines.',
    features: ['Stripe 3DS Settlement', 'Dynamic Tax Engine', 'Inventory Holds', 'Order Notifications', 'Review System'],
    icon: ShoppingCart,
    iconColor: 'var(--theme-accent)',
    iconBg: 'var(--theme-accent-soft)',
    isCore: true,
    settingsUrl: '/admin/globals/store-settings',
  },
  {
    id: 'plugin-discounts',
    featureKey: 'discountCodes',
    name: 'Discount Codes & Promotions Plugin',
    package: '@buildmyrig/plugin-shop/discounts',
    version: '3.90.2',
    author: 'BuildMyRig Core Team',
    category: 'commerce',
    categoryLabel: 'Commerce',
    description: 'Manages promotional voucher codes, percentage & fixed discounts, minimum cart subtotals, redemption rate limits, and checkout coupon validation.',
    disableReason: 'Disable if your storefront uses fixed everyday pricing and you want to prevent unauthorized coupon usage or hide checkout discount fields.',
    features: ['Cart Coupon Input', 'Percentage & Fixed Discounts', 'Usage Counter & Limits', 'Checkout Settlement Snapshots'],
    icon: Tag,
    iconColor: 'var(--theme-warning)',
    iconBg: 'var(--theme-warning-soft)',
    isCore: false,
    settingsUrl: '/admin/collections/discount-codes',
  },
  {
    id: 'plugin-reviews',
    featureKey: 'reviews',
    name: 'Customer Reviews & Ratings Plugin',
    package: '@buildmyrig/plugin-shop/reviews',
    version: '3.90.2',
    author: 'BuildMyRig Core Team',
    category: 'commerce',
    categoryLabel: 'Commerce',
    description: 'Enables 1-to-5 star customer ratings, written reviews, verified buyer tags, moderation queue in back-office, and PDP review showcase rails.',
    disableReason: 'Disable during early store launch before gathering verified buyer feedback or to prevent unreviewed comments from displaying.',
    features: ['1-5 Star Ratings', 'Review Moderation Queue', 'Verified Buyer Verification', 'PDP Testimonial Rails'],
    icon: Star,
    iconColor: 'var(--theme-accent)',
    iconBg: 'var(--theme-accent-soft)',
    isCore: false,
    settingsUrl: '/admin/collections/reviews',
  },
  {
    id: 'plugin-reservations',
    featureKey: 'inventoryReservations',
    name: 'Inventory Reservations & Cart Holds Plugin',
    package: '@buildmyrig/plugin-shop/reservations',
    version: '3.90.2',
    author: 'BuildMyRig Core Team',
    category: 'commerce',
    categoryLabel: 'Commerce',
    description: 'Locks inventory for 15 minutes when high-demand components (GPUs, CPUs) enter customer carts, preventing checkout overselling and race conditions.',
    disableReason: 'Disable to use traditional instant checkout where items remain available to all users until final Stripe payment succeeds.',
    features: ['15-Minute Cart Lock', 'Anti-Oversell Fencing', 'Auto-Expiry Hold Release', 'Webhook Stock Recovery'],
    icon: Clock,
    iconColor: 'var(--theme-info)',
    iconBg: 'var(--theme-info-soft)',
    isCore: false,
    settingsUrl: '/admin/collections/inventory-reservations',
  },
  {
    id: 'plugin-tax-rates',
    featureKey: 'taxRates',
    name: 'Dynamic Tax Rates & Regional VAT Engine',
    package: '@buildmyrig/plugin-shop/tax-rates',
    version: '3.90.2',
    author: 'BuildMyRig Core Team',
    category: 'commerce',
    categoryLabel: 'Commerce',
    description: 'Calculates destination-based European VAT tables with standard and reduced tax tiers per delivery country and automatic tax line extraction at checkout.',
    disableReason: 'Disable if your store includes flat domestic VAT for all customers or sells exclusively within a single tax jurisdiction.',
    features: ['EU Country VAT Table', 'Standard & Reduced Tiers', 'VAT-Inclusive Math', 'Checkout Country Dropdown'],
    icon: Percent,
    iconColor: 'var(--theme-success)',
    iconBg: 'var(--theme-success-soft)',
    isCore: false,
    settingsUrl: '/admin/collections/tax-rates',
  },
  {
    id: 'plugin-pc-builder',
    name: 'RIG Studio PC Builder Engine',
    package: '@buildmyrig/plugin-pc-builder',
    version: '2.4.0',
    author: 'BuildMyRig Labs',
    category: 'builder',
    categoryLabel: 'Engine',
    description: 'Hardware compatibility matrix engine, socket validation rules, custom presets, wattage power budget calculation, and live telemetry.',
    features: ['Socket Auto-Matching', 'Wattage Envelope', 'GPU Clearance Check', 'Rule Matrix Manager', 'Preset Importer'],
    icon: Cpu,
    iconColor: 'var(--theme-info)',
    iconBg: 'var(--theme-info-soft)',
    isCore: true,
    settingsUrl: '/admin/globals/builder-settings',
  },
  {
    id: 'plugin-pages',
    name: 'Page Builder & Modular Block Suite v2',
    package: '@buildmyrig/plugin-pages',
    version: '2.1.0',
    author: 'BuildMyRig Core Team',
    category: 'cms',
    categoryLabel: 'CMS & Content',
    description: 'Dynamic landing page orchestrator with 14 modular responsive blocks, visual category top-block zones, theme tokens, and mega menu globals.',
    features: ['Hero Media Parallax', 'Trust Badges', 'Countdown Banners', 'Spec Grids', 'Interactive FAQs'],
    icon: Layers,
    iconColor: 'var(--theme-success)',
    iconBg: 'var(--theme-success-soft)',
    isCore: true,
    settingsUrl: '/admin/globals/site-settings',
  },
  {
    id: 'stripe-adapter',
    name: 'Stripe Payments & Webhooks Adapter',
    package: '@stripe/stripe-js',
    version: '9.17.0',
    author: 'Stripe & Payload',
    category: 'integrations',
    categoryLabel: 'Payments',
    description: 'Secure PCI-compliant payment sheet integration with SCA/3D Secure authorization, idempotent webhook processing, and automatic refund workflows.',
    features: ['Payment Intents', 'Apple Pay & Google Pay', 'Webhook Verification', 'CAS Token Locking'],
    icon: CreditCard,
    iconColor: 'var(--theme-accent)',
    iconBg: 'var(--theme-accent-soft)',
    isCore: false,
    settingsUrl: '/admin/collections/transactions',
  },
  {
    id: 'lexical-richtext',
    name: 'Lexical RichText Editor & Embeds',
    package: '@payloadcms/richtext-lexical',
    version: '3.90.2',
    author: 'Payload CMS',
    category: 'cms',
    categoryLabel: 'Editor',
    description: 'Next-generation extensible WYSIWYG editor supporting nested blocks, slash commands (/), clean markdown generation, and custom embeds.',
    features: ['Slash Commands', 'Block Inlining', 'Clean HTML Export', 'Custom Link Modals'],
    icon: FileCode,
    iconColor: 'var(--theme-warning)',
    iconBg: 'var(--theme-warning-soft)',
    isCore: true,
  },
  {
    id: 'seo-plugin',
    name: 'SEO & OpenGraph Social Graph Engine',
    package: '@payloadcms/plugin-seo',
    version: '3.90.2',
    author: 'Payload CMS',
    category: 'cms',
    categoryLabel: 'SEO',
    description: 'Automates metadata generation, canonical URL resolution, dynamic OpenGraph image previews, Twitter card meta, and JSON-LD structured data.',
    features: ['Auto Title Templates', 'Dynamic OG Previews', 'Schema.org JSON-LD', 'Search Index Robots'],
    icon: Search,
    iconColor: 'var(--theme-info)',
    iconBg: 'var(--theme-info-soft)',
    isCore: true,
    settingsUrl: '/admin/globals/site-settings',
  },
  {
    id: 'theme-revalidate',
    name: 'Live Theme Revalidation Engine',
    package: 'apps/web/lib/theme-revalidate-plugin',
    version: '1.0.0',
    author: 'BuildMyRig Core Team',
    category: 'core',
    categoryLabel: 'System',
    description: 'On-demand ISR revalidation hook pipeline triggering instantaneous cache invalidation on storefront chrome when theme or settings change.',
    features: ['Tag Revalidation', 'Path Busting', 'Zero Downtime', 'Sub-second Propagation'],
    icon: RefreshCw,
    iconColor: 'var(--theme-success)',
    iconBg: 'var(--theme-success-soft)',
    isCore: true,
    settingsUrl: '/admin/globals/theme',
  },
]

const subscribePlugins = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr-plugin-features-change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr-plugin-features-change', cb)
  }
}

const getPluginsSnapshot = (): string => {
  try {
    return localStorage.getItem('bmr_plugin_features') || ''
  } catch {
    return ''
  }
}

const getPluginsServerSnapshot = (): string => ''

export const PluginsManagerView: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notification, setNotification] = useState<string | null>(null)
  const { showToast } = useToast()

  const rawFeatures = useSyncExternalStore(subscribePlugins, getPluginsSnapshot, getPluginsServerSnapshot)

  const pluginStatus = useMemo<Record<string, boolean>>(() => {
    const status: Record<string, boolean> = {}
    SYSTEM_PLUGINS.forEach((p) => {
      status[p.id] = true
    })
    if (rawFeatures) {
      try {
        const parsed = JSON.parse(rawFeatures)
        if (parsed.discountCodes === false) status['plugin-discounts'] = false
        if (parsed.reviews === false) status['plugin-reviews'] = false
        if (parsed.inventoryReservations === false) status['plugin-reservations'] = false
        if (parsed.taxRates === false) status['plugin-tax-rates'] = false
      } catch {}
    }
    return status
  }, [rawFeatures])

  // Synchronize with database on mount (updates storage and dispatches change event)
  useEffect(() => {
    fetch('/api/globals/store-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.features) {
          try {
            localStorage.setItem('bmr_plugin_features', JSON.stringify(data.features))
            window.dispatchEvent(new CustomEvent('bmr-plugin-features-change', { detail: data.features }))
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  const togglePlugin = async (id: string) => {
    const plugin = SYSTEM_PLUGINS.find((p) => p.id === id)
    if (!plugin) return

    if (plugin.featureKey) {
      const nextActive = !pluginStatus[id]
      let currentFeatures = { discountCodes: true, reviews: true, inventoryReservations: true, taxRates: true }
      try {
        const stored = localStorage.getItem('bmr_plugin_features')
        if (stored) currentFeatures = { ...currentFeatures, ...JSON.parse(stored) }
      } catch {}

      const updatedFeatures = { ...currentFeatures, [plugin.featureKey]: nextActive }
      try {
        localStorage.setItem('bmr_plugin_features', JSON.stringify(updatedFeatures))
        window.dispatchEvent(new CustomEvent('bmr-plugin-features-change', { detail: updatedFeatures }))
      } catch {}

      const message = `${plugin.name} ${nextActive ? 'activated' : 'deactivated'}.`
      setNotification(`${message} Sidebar navigation and storefront pipelines updated.`)
      showToast(
        `${plugin.name} ${nextActive ? 'Activated' : 'Deactivated'}`,
        'Sidebar navigation and storefront pipelines updated.',
        nextActive ? 'success' : 'info',
      )

      try {
        await fetch('/api/globals/store-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features: updatedFeatures }),
        })
      } catch (err) {
        console.error('Failed to sync plugin state:', err)
      }
    } else {
      setNotification(`${plugin.name} is a core architecture module. Status updated in view.`)
      showToast('Core Architecture Module', `${plugin.name} cannot be deactivated.`, 'warning')
    }

    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const filteredPlugins = useMemo(() => {
    return SYSTEM_PLUGINS.filter((plugin) => {
      const matchesCategory =
        filterCategory === 'all' ||
        (filterCategory === 'core' && plugin.isCore) ||
        (filterCategory === 'integrations' && !plugin.isCore) ||
        plugin.category === filterCategory

      const matchesSearch =
        !searchQuery.trim() ||
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesCategory && matchesSearch
    })
  }, [filterCategory, searchQuery])

  const stats = useMemo(() => {
    const total = SYSTEM_PLUGINS.length
    const active = Object.values(pluginStatus).filter(Boolean).length
    const core = SYSTEM_PLUGINS.filter((p) => p.isCore).length
    return { total, active, core, inactive: total - active, optional: total - core, integrations: total - core }
  }, [pluginStatus])

  return (
    <div className="bmr-plugins-view">
      {/* View Header */}
      <div className="bmr-plugins-header">
        <div className="bmr-plugins-header__top">
          <div>
            <Badge variant="success" dot style={{ marginBottom: '8px' }}>
              <Sparkles size={12} />
              <span>MODULAR EXTENSIONS RUNTIME</span>
            </Badge>
            <h1 className="bmr-plugins-header__title">
              Plugins &amp; Extensions Manager
            </h1>
            <p className="bmr-plugins-header__subtitle">
              Enable, disable, and configure core commerce engines, hardware rules, block suites, and integration drivers.
            </p>
          </div>

          <div className="bmr-plugins-header__actions">
            <Button
              variant="secondary"
              size="sm"
              href="/admin/globals/store-settings"
            >
              <Settings size={14} />
              <span>Store Settings</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              href="/admin/compatibility-rules-manager"
            >
              <Cpu size={14} />
              <span>Rule Matrix</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Notification Banner */}
      {notification && (
        <div className="bmr-plugins-notification" role="status">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* 4-Card Telemetry Ribbon (Matching Mockup) */}
      <div className="bmr-kpi-grid" style={{ marginBottom: '20px' }}>
        <MetricCard
          label="Installed Modules"
          value={stats.total}
          subtext="Full ecosystem loaded"
          trend={{ direction: 'neutral', label: `${stats.core} Core Architecture` }}
          icon={Boxes}
        />
        <MetricCard
          label="Active Engines"
          value={`${stats.active} / ${stats.total}`}
          subtext="Storefront & Builder pipeline"
          trend={{ direction: 'neutral', label: `${stats.inactive} disabled` }}
          icon={Activity}
        />
        <MetricCard
          label="Optional Modules"
          value={stats.optional}
          subtext="Feature-flagged plugins"
          trend={{ direction: 'neutral', label: 'toggled via Store Settings' }}
          icon={Zap}
        />
        <MetricCard
          label="Core Architecture"
          value={stats.core}
          subtext="Always-on system plugins"
          trend={{ direction: 'neutral', label: 'compile-time' }}
          icon={ShieldCheck}
        />
      </div>

      {/* Top Filter and Search Bar */}
      <div className="bmr-plugins-toolbar">
        <FilterPills
          items={[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'commerce', label: 'Commerce' },
            { id: 'builder', label: 'PC Builder' },
            { id: 'cms', label: 'CMS & Blocks' },
            { id: 'core', label: 'Core / Must-Use' },
          ]}
          activeId={filterCategory}
          onChange={setFilterCategory}
        />

        {/* Search Input */}
        <div className="bmr-plugins-search">
          <Input
            type="text"
            placeholder="Search installed plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefixSlot={<Search size={14} />}
          />
        </div>
      </div>

      {/* Plugins Grid or Empty State */}
      {filteredPlugins.length === 0 ? (
        <EmptyState
          icon={<Layers size={24} />}
          title="No plugins found"
          description={`No plugins match the query "${searchQuery}" or selected category filter.`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setFilterCategory('all')
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="bmr-plugins-grid">
          {filteredPlugins.map((plugin) => {
            const Icon = plugin.icon
            const isActive = pluginStatus[plugin.id]

            return (
              <Card
                key={plugin.id}
                className={clsx(
                  'bmr-plugin-card',
                  isActive ? 'bmr-plugin-card--active' : 'bmr-plugin-card--inactive',
                )}
              >
                <div>
                  {/* Plugin Top Bar */}
                  <div className="bmr-plugin-card__top">
                    <div className="bmr-plugin-card__info">
                      <div
                        className="bmr-plugin-card__icon"
                        style={{
                          background: plugin.iconBg,
                          border: `1px solid ${plugin.iconColor}`,
                          color: plugin.iconColor,
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <h3 className="bmr-plugin-card__title">
                          {plugin.name}
                        </h3>
                        <div className="bmr-plugin-card__meta">
                          <code className="bmr-plugin-card__package">
                            {plugin.package}
                          </code>
                          <span>v{plugin.version}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Toggle / Badge */}
                    <Badge variant={isActive ? 'success' : 'muted'} dot={isActive}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="bmr-plugin-card__desc">
                    {plugin.description}
                  </p>

                  {/* When to disable explanation box */}
                  {plugin.disableReason && (
                    <div className="bmr-plugin-card__disable-box">
                      <AlertCircle size={14} style={{ color: 'var(--theme-warning)', flexShrink: 0, marginTop: '1px' }} />
                      <span>
                        <strong>When to disable:</strong> {plugin.disableReason}
                      </span>
                    </div>
                  )}

                  {/* Features Tags */}
                  <div className="bmr-plugin-card__features">
                    {plugin.features.map((feat) => (
                      <span key={feat} className="bmr-plugin-card__feature-chip">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Plugin Footer Controls */}
                <div className="bmr-plugin-card__footer">
                  <div className="bmr-plugin-card__footer-left">
                    {plugin.settingsUrl && isActive && (
                      <Link href={plugin.settingsUrl} className="bmr-plugin-card__config-link">
                        <Sliders size={12} />
                        <span>Configure</span>
                      </Link>
                    )}
                    {plugin.isCore && (
                      <span className="bmr-plugin-card__must-use">
                        • Must-Use
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  <Button
                    variant={isActive ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => togglePlugin(plugin.id)}
                  >
                    {isActive ? 'Deactivate' : 'Activate Plugin'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PluginsManagerView

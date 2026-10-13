'use client'

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  Package,
  FolderTree,
  Award,
  Star,
  Tag,
  Clock,
  Truck,
  Percent,
  SlidersHorizontal,
  Cpu,
  Laptop,
  Flame,
  ShieldCheck,
  Binary,
  BarChart3,
  Wrench,
  FileText,
  Image as ImageIcon,
  Settings,
  Palette,
  Menu as MenuIcon,
  Store,
  Box,
  Users,
  ExternalLink,
  LogOut,
  Sparkles,
  X,
  Puzzle,
  Moon,
  Sun,
  Zap,
  Sliders,
  Component,
  CreditCard,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  badge?: string
  keywords?: string[]
}

export interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'store',
    title: 'Store & Commerce',
    items: [
      { id: 'orders', label: 'Orders', href: '/admin/collections/orders', icon: ShoppingCart, keywords: ['sales', 'checkout', 'purchases'] },
      { id: 'products', label: 'Products', href: '/admin/collections/products', icon: Package, keywords: ['items', 'inventory', 'skus'] },
      { id: 'variants', label: 'Variants', href: '/admin/collections/variants', icon: Sliders, keywords: ['options', 'skus', 'stock'] },
      { id: 'categories', label: 'Categories', href: '/admin/collections/categories', icon: FolderTree, keywords: ['taxonomy', 'groups'] },
      { id: 'brands', label: 'Brands', href: '/admin/collections/brands', icon: Award, keywords: ['manufacturers', 'vendors'] },
      { id: 'reviews', label: 'Reviews', href: '/admin/collections/reviews', icon: Star, keywords: ['ratings', 'feedback', 'comments'] },
      { id: 'carts', label: 'Carts', href: '/admin/collections/carts', icon: ShoppingCart, keywords: ['baskets', 'guest carts', 'abandoned'] },
      { id: 'transactions', label: 'Transactions', href: '/admin/collections/transactions', icon: CreditCard, keywords: ['payments', 'ledger', 'settlement'] },
      { id: 'discount-codes', label: 'Discount Codes', href: '/admin/collections/discount-codes', icon: Tag, keywords: ['coupons', 'promos', 'vouchers'] },
      { id: 'inventory-reservations', label: 'Reservations', href: '/admin/collections/inventory-reservations', icon: Clock, keywords: ['cart locks', 'stock holds'] },
      { id: 'shipping-bands', label: 'Shipping Bands', href: '/admin/collections/shipping-bands', icon: Truck, keywords: ['delivery', 'freight'] },
      { id: 'tax-rates', label: 'Tax Rates', href: '/admin/collections/tax-rates', icon: Percent, keywords: ['vat', 'duties'] },
      { id: 'attribute-types', label: 'Product Attributes', href: '/admin/collections/attribute-types', icon: SlidersHorizontal, keywords: ['specs', 'options', 'attributes', 'terms', 'values'] },
    ],
  },
  {
    id: 'builder',
    title: 'PC Builder Engine',
    items: [
      { id: 'components', label: 'Components', href: '/admin/collections/components', icon: Cpu, keywords: ['cpu', 'gpu', 'ram', 'hardware', 'parts'] },
      { id: 'configured-builds', label: 'Configured Builds', href: '/admin/collections/configured-builds', icon: Laptop, keywords: ['saved rigs', 'custom rigs'] },
      { id: 'build-templates', label: 'Build Templates', href: '/admin/collections/build-templates', icon: Flame, keywords: ['presets', 'featured rigs'] },
      { id: 'component-categories', label: 'Component Slots', href: '/admin/collections/component-categories', icon: FolderTree, keywords: ['slots', 'socket types'] },
      { id: 'compatibility-rules', label: 'Compatibility Rules', href: '/admin/collections/compatibility-rules', icon: ShieldCheck, keywords: ['validation', 'conflicts', 'matrix'] },
      { id: 'derived-power-rules', label: 'Derived Power Rules', href: '/admin/collections/derived-power-rules', icon: Zap, keywords: ['psu', 'wattage', 'derived rules'] },
      { id: 'rules-manager', label: 'Rule Matrix Manager', href: '/admin/compatibility-rules-manager', icon: Binary, badge: 'Live', keywords: ['interactive rules', 'matrix table'] },
      { id: 'build-stats', label: 'Builder Analytics', href: '/admin/build-stats', icon: BarChart3, badge: 'Stats', keywords: ['metrics', 'telemetry', 'conversion'] },
      { id: 'builder-settings', label: 'Builder Settings', href: '/admin/globals/builder-settings', icon: Wrench, keywords: ['margins', 'defaults', 'fees'] },
    ],
  },
  {
    id: 'content',
    title: 'Content & Media',
    items: [
      { id: 'pages', label: 'Pages', href: '/admin/collections/pages', icon: FileText, keywords: ['landing', 'about', 'blocks'] },
      { id: 'media', label: 'Media Library', href: '/admin/collections/media', icon: ImageIcon, keywords: ['images', 'uploads', 'assets', 'photos'] },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Design',
    items: [
      { id: 'site-settings', label: 'Site Settings', href: '/admin/globals/site-settings', icon: Settings, keywords: ['seo', 'branding', 'metadata'] },
      { id: 'theme', label: 'Theme Studio', href: '/admin/globals/theme', icon: Palette, keywords: ['colors', 'fonts', 'tokens', 'dark mode'] },
      { id: 'mega-menu', label: 'Mega Menu', href: '/admin/globals/mega-menu', icon: MenuIcon, keywords: ['navigation', 'header links'] },
      { id: 'store-settings', label: 'Store Settings', href: '/admin/globals/store-settings', icon: Store, keywords: ['free shipping', 'banner', 'trust'] },
      { id: 'packaging-tiers', label: 'Packaging Tiers', href: '/admin/globals/packaging-tiers', icon: Box, keywords: ['crates', 'boxes', 'unboxing'] },
      { id: 'design-system', label: 'Design System', href: '/admin/design-system', icon: Component, badge: 'Spec', keywords: ['ui standards', 'form spec', 'primitives', 'design tokens', 'styleguide'] },
    ],
  },
  {
    id: 'system',
    title: 'Access & System',
    items: [
      { id: 'users', label: 'Users & Staff', href: '/admin/collections/users', icon: Users, keywords: ['admins', 'managers', 'accounts', 'passwords'] },
      { id: 'plugins', label: 'Plugins & Extensions', href: '/admin/plugins', icon: Puzzle, badge: 'Active', keywords: ['plugins', 'modules', 'extensions', 'addons', 'integrations'] },
    ],
  },
]

const subscribeRail = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr-admin-rail-change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr-admin-rail-change', cb)
  }
}

const getRailSnapshot = (): boolean => {
  try {
    return localStorage.getItem('bmr_admin_rail') === 'true'
  } catch {
    return false
  }
}

const getRailServerSnapshot = (): boolean => false

const MOBILE_QUERY = '(max-width: 1023px)'

const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

const getMobileSnapshot = (): boolean => window.matchMedia(MOBILE_QUERY).matches

const getMobileServerSnapshot = (): boolean => false

const subscribeFeatures = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr-plugin-features-change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr-plugin-features-change', cb)
  }
}

const getFeaturesSnapshot = (): string => {
  try {
    return localStorage.getItem('bmr_plugin_features') || ''
  } catch {
    return ''
  }
}

const getFeaturesServerSnapshot = (): string => ''

const THEMES = [
  { label: 'Dark', value: 'precision-dark', icon: Moon, title: 'Modern Slate (Dark)' },
  { label: 'Light', value: 'light-clean', icon: Sun, title: 'Enterprise SaaS (Light)' },
  { label: 'Cyber', value: 'cyber-neon', icon: Zap, title: 'Cyber Neon (Tech)' },
  { label: 'Classic', value: 'classic-payload', icon: Sliders, title: 'Classic Payload' },
] as const

type AdminTheme = (typeof THEMES)[number]['value']

const subscribeTheme = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr-admin-theme-change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr-admin-theme-change', cb)
  }
}

const getThemeSnapshot = (): AdminTheme => {
  try {
    const stored = localStorage.getItem('bmr_admin_theme') as AdminTheme | null
    const rootTheme = document.documentElement.getAttribute('data-admin-theme') as AdminTheme | null
    const val = stored || rootTheme
    if (val && ['precision-dark', 'cyber-neon', 'light-clean', 'classic-payload'].includes(val)) {
      return val
    }
  } catch {}
  return 'precision-dark'
}

const getThemeServerSnapshot = (): AdminTheme => 'precision-dark'

function applyAdminTheme(next: AdminTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-admin-theme', next)
  document.documentElement.setAttribute('data-theme', next === 'light-clean' ? 'light' : 'dark')
  try {
    localStorage.setItem('bmr_admin_theme', next)
  } catch {}
  document.cookie = `bmr_admin_theme=${next}; path=/; max-age=31536000; SameSite=Lax`
  window.dispatchEvent(new CustomEvent('bmr-admin-theme-change', { detail: next }))
}

export const ModernAdminNav: React.FC = () => {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getMobileServerSnapshot)
  // The collapsed rail is a desktop affordance only — on ≤1023px the nav is
  // Payload's slide-in drawer, and an icon-only rail there leaves no labels.
  const railPref = useSyncExternalStore(subscribeRail, getRailSnapshot, getRailServerSnapshot)
  const isRail = railPref && !isMobile
  const rawFeatures = useSyncExternalStore(subscribeFeatures, getFeaturesSnapshot, getFeaturesServerSnapshot)
  const currentTheme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    store: true,
    builder: true,
    content: true,
    settings: true,
    system: true,
  })

  const features = useMemo(() => {
    if (rawFeatures) {
      try {
        return JSON.parse(rawFeatures)
      } catch {}
    }
    return {
      discountCodes: true,
      reviews: true,
      inventoryReservations: true,
      taxRates: true,
    }
  }, [rawFeatures])

  // Synchronize rail mode attribute on mount and updates
  useEffect(() => {
    if (isRail) {
      document.documentElement.setAttribute('data-admin-rail', 'true')
    } else {
      document.documentElement.removeAttribute('data-admin-rail')
    }
  }, [isRail])

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

  const toggleRail = () => {
    const next = !railPref
    try {
      localStorage.setItem('bmr_admin_rail', String(next))
      window.dispatchEvent(new Event('bmr-admin-rail-change'))
    } catch {}
  }

  const handleThemeSelect = (next: AdminTheme) => {
    applyAdminTheme(next)
  }

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const activePluginsCount = useMemo(() => {
    let count = 7 // Base registered plugins
    if (!features.discountCodes) count--
    if (!features.reviews) count--
    if (!features.inventoryReservations) count--
    if (!features.taxRates) count--
    return Math.max(count, 3)
  }, [features])

  // Filter items by feature toggles and search query
  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase()

    const isItemActive = (id: string) => {
      if (id === 'discount-codes') return features.discountCodes !== false
      if (id === 'reviews') return features.reviews !== false
      if (id === 'inventory-reservations') return features.inventoryReservations !== false
      if (id === 'tax-rates') return features.taxRates !== false
      return true
    }

    return NAV_SECTIONS.map((section) => {
      const items = section.items
        .filter((item) => isItemActive(item.id))
        .filter((item) => {
          if (!q) return true
          const matchesLabel = item.label.toLowerCase().includes(q)
          const matchesKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q))
          return matchesLabel || matchesKeywords
        })
        .map((item) => {
          if (item.id === 'plugins') {
            return { ...item, badge: `${activePluginsCount} Active` }
          }
          return item
        })
      return { ...section, items }
    }).filter((section) => section.items.length > 0)
  }, [search, features, activePluginsCount])

  return (
    <aside
      className={`bmr-modern-nav ${isRail ? 'bmr-nav--rail' : 'bmr-nav--expanded'}`}
      aria-label="Admin Navigation"
    >
      {/* 1. Header & Brand */}
      <div className="bmr-nav__header">
        <Link href="/admin" className="bmr-nav__brand">
          <div className="bmr-brand-badge">
            <Sparkles size={16} className="bmr-brand-sparkle" />
          </div>
          {!isRail && (
            <div className="bmr-brand-text">
              <span className="bmr-brand-title">BuildMyRig</span>
              <span className="bmr-brand-subtitle">Studio Admin</span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className="bmr-nav__toggle-btn"
          onClick={toggleRail}
          title={isRail ? 'Expand Sidebar' : 'Collapse to Rail'}
          aria-label={isRail ? 'Expand Sidebar' : 'Collapse to Rail'}
        >
          {isRail ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* 2. Instant Search Filter (Expanded Mode) */}
      {!isRail && (
        <div className="bmr-nav__search-wrapper">
          <div className="bmr-nav__search-box">
            <Search size={14} className="bmr-search-icon" />
            <input
              type="text"
              className="bmr-search-input"
              placeholder="Quick search... (⌘K)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                className="bmr-search-clear"
                onClick={() => setSearch('')}
                title="Clear filter"
              >
                <X size={12} />
              </button>
            ) : (
              <button
                type="button"
                className="bmr-nav__search-kbd-btn"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('bmr-open-command-palette'))
                  }
                }}
                title="Open Command Palette (⌘K)"
                aria-label="Open Command Palette"
              >
                <kbd className="bmr-kbd">⌘K</kbd>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Navigation Sections & Links */}
      <div className="bmr-nav__content">
        {filteredSections.map((section) => {
          const isOpen = Boolean(openSections[section.id]) || Boolean(search.trim())

          return (
            <div key={section.id} className="bmr-nav-section">
              {!isRail && (
                <button
                  type="button"
                  className="bmr-section-header"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isOpen}
                >
                  <span className="bmr-section-title">{section.title}</span>
                  <div className="bmr-section-meta">
                    <span className="bmr-section-count">{section.items.length}</span>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>
              )}

              {(isOpen || isRail) && (
                <ul className="bmr-section-list">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      Boolean(pathname && (pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))))

                    return (
                      <li key={item.id} className="bmr-nav-item">
                        <Link
                          href={item.href}
                          className={`bmr-nav-link ${isActive ? 'bmr-nav-link--active' : ''}`}
                          title={isRail ? item.label : undefined}
                        >
                          <Icon size={16} className="bmr-nav-icon" />
                          {!isRail && <span className="bmr-nav-label">{item.label}</span>}
                          {!isRail && item.badge && (
                            <span className="bmr-nav-badge">{item.badge}</span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        {filteredSections.length === 0 && (
          <div className="bmr-nav__empty">
            <p>No matching collections</p>
            <button
              type="button"
              className="bmr-nav__empty-reset"
              onClick={() => setSearch('')}
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* 4. Footer & Shell Controls: Theme Picker & User Profile Card */}
      <div className="bmr-nav__footer">
        {/* Theme Picker */}
        <div className="bmr-nav-theme-box">
          {!isRail ? (
            <div className="bmr-nav-theme-picker" role="radiogroup" aria-label="Theme Mode">
              <span className="bmr-nav-theme-label">Theme</span>
              <div className="bmr-nav-theme-buttons">
                {THEMES.map((t) => {
                  const Icon = t.icon
                  const isSelected = currentTheme === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      className={`bmr-nav-theme-btn ${isSelected ? 'bmr-nav-theme-btn--active' : ''}`}
                      onClick={() => handleThemeSelect(t.value)}
                      title={t.title}
                      aria-label={t.title}
                    >
                      <Icon size={13} />
                      <span className="bmr-nav-theme-name">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="bmr-nav-theme-btn bmr-nav-theme-btn--rail"
              onClick={() => {
                const next = currentTheme === 'light-clean' ? 'precision-dark' : 'light-clean'
                handleThemeSelect(next)
              }}
              title={`Theme: ${currentTheme}. Click to toggle`}
              aria-label="Toggle admin theme"
            >
              {currentTheme === 'light-clean' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
        </div>

        {/* User Profile Card */}
        <div className="bmr-nav-user-card">
          <div className="bmr-nav-user-info">
            <div className="bmr-nav-user-avatar" aria-hidden="true">
              <span>AD</span>
            </div>
            {!isRail && (
              <div className="bmr-nav-user-details">
                <span className="bmr-nav-user-name">Administrator</span>
                <span className="bmr-nav-user-email">admin@buildmyrig.test</span>
              </div>
            )}
          </div>

          {!isRail ? (
            <div className="bmr-nav-user-actions">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="bmr-nav-user-btn"
                title="Open live storefront in new tab"
                aria-label="Open storefront"
              >
                <ExternalLink size={14} />
              </a>
              <Link
                href="/admin/logout"
                className="bmr-nav-user-btn bmr-nav-user-btn--logout"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </Link>
            </div>
          ) : (
            <Link
              href="/admin/logout"
              className="bmr-nav-user-btn bmr-nav-user-btn--logout"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </Link>
          )}
        </div>
      </div>
    </aside>
  )
}

export default ModernAdminNav

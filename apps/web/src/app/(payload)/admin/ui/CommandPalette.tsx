'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
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
  Users,
  Puzzle,
  ExternalLink,
  Moon,
  Sun,
  Zap,
  Sliders,
  X,
  ArrowRight,
  CreditCard,
} from 'lucide-react'

export interface CommandAction {
  id: string
  label: string
  category: 'Store' | 'Builder' | 'Content' | 'System' | 'Actions'
  icon: React.ComponentType<{ size?: number; className?: string }>
  keywords?: string[]
  href?: string
  run?: () => void
}

function applyAdminTheme(next: 'precision-dark' | 'light-clean' | 'cyber-neon' | 'classic-payload') {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-admin-theme', next)
  document.documentElement.setAttribute('data-theme', next === 'light-clean' ? 'light' : 'dark')
  try {
    localStorage.setItem('bmr_admin_theme', next)
  } catch {}
  document.cookie = `bmr_admin_theme=${next}; path=/; max-age=31536000; SameSite=Lax`
  window.dispatchEvent(new CustomEvent('bmr-admin-theme-change', { detail: next }))
}

export interface CommandPaletteProps {
  isOpen?: boolean
  onClose?: () => void
  initialQuery?: string
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  initialQuery = '',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const handleClose = useCallback(() => {
    if (controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalIsOpen(false)
    }
  }, [controlledOnClose])

  const handleOpen = useCallback(() => {
    setQuery('')
    setSelectedIndex(0)
    setInternalIsOpen(true)
  }, [])

  // Listen for global shortcut (Cmd/Ctrl + K) & custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) {
          handleClose()
        } else {
          handleOpen()
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        handleClose()
      }
    }

    const handleCustomOpen = () => {
      handleOpen()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('bmr-open-command-palette', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('bmr-open-command-palette', handleCustomOpen)
    }
  }, [isOpen, handleClose, handleOpen])

  const navigateTo = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = url
    }
  }, [])

  const actions: CommandAction[] = useMemo(
    () => [
      // Store
      { id: 'orders', label: 'Orders', category: 'Store', icon: ShoppingCart, href: '/admin/collections/orders', keywords: ['sales', 'purchases'] },
      { id: 'products', label: 'Products', category: 'Store', icon: Package, href: '/admin/collections/products', keywords: ['inventory', 'skus', 'items'] },
      { id: 'categories', label: 'Categories', category: 'Store', icon: FolderTree, href: '/admin/collections/categories', keywords: ['taxonomy'] },
      { id: 'variants', label: 'Variants', category: 'Store', icon: Sliders, href: '/admin/collections/variants', keywords: ['options', 'skus', 'stock'] },
      { id: 'brands', label: 'Brands', category: 'Store', icon: Award, href: '/admin/collections/brands', keywords: ['vendors', 'manufacturers'] },
      { id: 'reviews', label: 'Reviews', category: 'Store', icon: Star, href: '/admin/collections/reviews', keywords: ['ratings', 'feedback'] },
      { id: 'carts', label: 'Carts', category: 'Store', icon: ShoppingCart, href: '/admin/collections/carts', keywords: ['baskets', 'abandoned', 'guest'] },
      { id: 'transactions', label: 'Transactions', category: 'Store', icon: CreditCard, href: '/admin/collections/transactions', keywords: ['payments', 'ledger', 'settlement'] },
      { id: 'discount-codes', label: 'Discount Codes', category: 'Store', icon: Tag, href: '/admin/collections/discount-codes', keywords: ['coupons', 'promos'] },
      { id: 'inventory-reservations', label: 'Inventory Reservations', category: 'Store', icon: Clock, href: '/admin/collections/inventory-reservations', keywords: ['cart holds', 'stock'] },
      { id: 'shipping-bands', label: 'Shipping Bands', category: 'Store', icon: Truck, href: '/admin/collections/shipping-bands', keywords: ['delivery', 'freight'] },
      { id: 'tax-rates', label: 'Tax Rates', category: 'Store', icon: Percent, href: '/admin/collections/tax-rates', keywords: ['vat', 'duties'] },
      { id: 'attribute-types', label: 'Product Attributes', category: 'Store', icon: SlidersHorizontal, href: '/admin/collections/attribute-types', keywords: ['specs', 'options'] },

      // Builder
      { id: 'components', label: 'Components', category: 'Builder', icon: Cpu, href: '/admin/collections/components', keywords: ['hardware', 'gpu', 'cpu', 'ram'] },
      { id: 'configured-builds', label: 'Configured Builds', category: 'Builder', icon: Laptop, href: '/admin/collections/configured-builds', keywords: ['saved rigs', 'custom rigs'] },
      { id: 'build-templates', label: 'Build Templates', category: 'Builder', icon: Flame, href: '/admin/collections/build-templates', keywords: ['presets', 'featured rigs'] },
      { id: 'compatibility-rules', label: 'Compatibility Rules', category: 'Builder', icon: ShieldCheck, href: '/admin/collections/compatibility-rules', keywords: ['conflicts', 'matrix'] },
      { id: 'derived-power-rules', label: 'Derived Power Rules', category: 'Builder', icon: Zap, href: '/admin/collections/derived-power-rules', keywords: ['psu', 'wattage', 'derived rules'] },
      { id: 'rules-manager', label: 'Rule Matrix Manager', category: 'Builder', icon: Binary, href: '/admin/compatibility-rules-manager', keywords: ['matrix', 'validation', 'rules'] },
      { id: 'build-stats', label: 'Builder Analytics', category: 'Builder', icon: BarChart3, href: '/admin/build-stats', keywords: ['metrics', 'telemetry'] },
      { id: 'builder-settings', label: 'Builder Settings', category: 'Builder', icon: Wrench, href: '/admin/globals/builder-settings', keywords: ['margins', 'defaults'] },

      // Content
      { id: 'pages', label: 'Pages', category: 'Content', icon: FileText, href: '/admin/collections/pages', keywords: ['cms', 'landing'] },
      { id: 'media', label: 'Media Library', category: 'Content', icon: ImageIcon, href: '/admin/collections/media', keywords: ['assets', 'images', 'uploads'] },

      // System
      { id: 'users', label: 'Users & Staff', category: 'System', icon: Users, href: '/admin/collections/users', keywords: ['admins', 'accounts'] },
      { id: 'plugins', label: 'Plugins & Extensions', category: 'System', icon: Puzzle, href: '/admin/plugins', keywords: ['extensions', 'modules', 'integrations'] },
      { id: 'site-settings', label: 'Site Settings', category: 'System', icon: Settings, href: '/admin/globals/site-settings', keywords: ['seo', 'branding'] },
      { id: 'theme-studio', label: 'Theme Studio', category: 'System', icon: Palette, href: '/admin/globals/theme', keywords: ['colors', 'fonts', 'tokens'] },

      // Actions
      {
        id: 'storefront',
        label: 'Launch Storefront',
        category: 'Actions',
        icon: ExternalLink,
        keywords: ['store', 'live site', 'frontend'],
        run: () => {
          if (typeof window !== 'undefined') {
            window.open('/', '_blank', 'noopener,noreferrer')
          }
        },
      },
      {
        id: 'theme-dark',
        label: 'Theme: Modern Slate (Dark)',
        category: 'Actions',
        icon: Moon,
        keywords: ['dark mode', 'precision dark'],
        run: () => applyAdminTheme('precision-dark'),
      },
      {
        id: 'theme-light',
        label: 'Theme: Enterprise SaaS (Light)',
        category: 'Actions',
        icon: Sun,
        keywords: ['light mode', 'white'],
        run: () => applyAdminTheme('light-clean'),
      },
      {
        id: 'theme-cyber',
        label: 'Theme: Cyber Neon (Tech)',
        category: 'Actions',
        icon: Zap,
        keywords: ['cyberpunk', 'neon'],
        run: () => applyAdminTheme('cyber-neon'),
      },
      {
        id: 'theme-classic',
        label: 'Theme: Classic Payload',
        category: 'Actions',
        icon: Sliders,
        keywords: ['default payload', 'stock'],
        run: () => applyAdminTheme('classic-payload'),
      },
    ],
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.keywords?.some((k) => k.toLowerCase().includes(q))
    )
  }, [actions, query])

  const executeAction = useCallback(
    (action: CommandAction) => {
      handleClose()
      if (action.run) {
        action.run()
      } else if (action.href) {
        navigateTo(action.href)
      }
    },
    [handleClose, navigateTo]
  )

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        executeAction(filtered[selectedIndex])
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="bmr-command-palette-backdrop"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="bmr-command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="bmr-command-palette__search">
          <Search size={18} className="bmr-command-palette__search-icon" />
          <input
            autoFocus
            type="text"
            className="bmr-command-palette__input"
            placeholder="Type a command or jump to screen... (ESC to exit)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
            aria-label="Search commands and destinations"
          />
          {query ? (
            <button
              type="button"
              className="bmr-command-palette__clear"
              onClick={() => {
                setQuery('')
                setSelectedIndex(0)
              }}
              aria-label="Clear query"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="bmr-kbd">ESC</kbd>
          )}
        </div>

        {/* Results List */}
        <div className="bmr-command-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <div className="bmr-command-palette__empty">
              <span>No matching commands or destinations found.</span>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`bmr-command-palette__item ${
                    isSelected ? 'bmr-command-palette__item--selected' : ''
                  }`}
                  onClick={() => executeAction(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="bmr-command-palette__item-content">
                    <div className="bmr-command-palette__item-icon">
                      <Icon size={15} />
                    </div>
                    <div className="bmr-command-palette__item-meta">
                      <span className="bmr-command-palette__item-label">{item.label}</span>
                      <span className="bmr-command-palette__item-category">{item.category}</span>
                    </div>
                  </div>
                  <ArrowRight size={14} className="bmr-command-palette__item-arrow" />
                </button>
              )
            })
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="bmr-command-palette__footer">
          <div className="bmr-command-palette__hints">
            <span>
              Use <kbd className="bmr-kbd">↑</kbd> <kbd className="bmr-kbd">↓</kbd> to navigate
            </span>
            <span>
              Press <kbd className="bmr-kbd">↵ Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="bmr-kbd">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette

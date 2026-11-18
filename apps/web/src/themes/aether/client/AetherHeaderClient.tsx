'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Menu,
  X,
  Search,
  ShoppingBag,
  ChevronDown,
} from 'lucide-react'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import type { MegaMenuSection } from '@buildmyrig/plugin-pages'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccountNav } from '@/components/AccountNav'
import { WishlistNav } from '@/components/WishlistNav'
import { useCartDrawerStore } from '@/lib/cart-drawer-store'
import { AetherSearchModal } from './AetherSearchModal'

type NavLink = { label: string; url: string }
type ThemeLabels = { altLabel: string; defaultLabel: string }
type CartShape = { items?: Array<{ quantity?: number }>; subtotal?: number }

export function AetherHeaderClient({
  navLinks,
  announcements,
  megaMenu,
  themeLabels,
}: {
  navLinks: NavLink[]
  announcements: string[]
  megaMenu: MegaMenuSection[]
  themeLabels?: ThemeLabels
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const openCart = useCartDrawerStore((s) => s.open)
  const { cart } = useCart()
  const cartData = cart as unknown as CartShape | null
  const itemCount = (cartData?.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 1), 0)

  // ⌘K hotkey listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Touch and click outside listener for mega-menu
  useEffect(() => {
    if (!megaMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMegaMenuOpen(false)
    }
    const onClick = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    window.addEventListener('touchstart', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('touchstart', onClick)
    }
  }, [megaMenuOpen])

  const tickerMessage =
    announcements && announcements.length > 0
      ? announcements[0]
      : '24H BURN-IN TELEMETRY CERTIFIED // RTX 5090 & CUSTOM LOOP RESTOCK DROP ACTIVE'

  return (
    <div ref={headerRef}>
      {/* 1. Hardware Telemetry Ticker Strip */}
      <div className="ae-ticker">
        <div className="ae-ticker__item">
          <span className="ae-ticker__status" aria-hidden />
          <span className="ae-ticker__badge">TELEMETRY</span>
          <span>{tickerMessage}</span>
        </div>
        <div className="ae-ticker__aside">
          <span>LAB CODE: AETHER-ZH</span>
          <span>|</span>
          <span>DELTA-T &lt; 12°C</span>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="ae-header__inner">
        <div className="ae-header__nav-group">
          <Link href="/" className="ae-brand" aria-label="Aether Rigs Homepage">
            <div className="ae-brand__badge">A+</div>
            <span className="ae-brand__text">AETHER // RIGS</span>
          </Link>

          <nav className="ae-nav" aria-label="Aether Main Navigation">
            <button
              type="button"
              onClick={() => setMegaMenuOpen((prev) => !prev)}
              className="ae-nav__link"
              aria-expanded={megaMenuOpen}
            >
              <span>Hardware</span>
              <ChevronDown size={14} />
            </button>
            {navLinks.map((link) => (
              <Link key={link.url} href={link.url} className="ae-nav__link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="ae-header__actions">
          {/* Quick Search */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ae-search-trigger"
            aria-label="Search catalog (Press Ctrl+K)"
          >
            <Search size={14} />
            <span className="ae-u-hidden ae-u-sm-inline">Search specs...</span>
            <kbd>⌘K</kbd>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle
            altLabel={themeLabels?.altLabel ?? 'Titanium Light'}
            defaultLabel={themeLabels?.defaultLabel ?? 'Aether Engineering'}
          />

          {/* Wishlist */}
          <WishlistNav />

          {/* Account */}
          <AccountNav />

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openCart}
            className="ae-cart-btn"
            aria-label={`Open shopping cart (${itemCount} items)`}
          >
            <ShoppingBag size={20} />
            {itemCount > 0 ? (
              <span className="ae-cart-badge">
                {itemCount}
              </span>
            ) : null}
          </button>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="ae-burger"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 3. Aether MegaMenu Flyout */}
      {megaMenuOpen ? (
        <div className="ae-megamenu" role="region" aria-label="Hardware Mega Menu">
          <div className="ae-megamenu__inner">
            {megaMenu && megaMenu.length > 0 ? (
              megaMenu.map((section, idx) => (
                <div key={section.title || idx}>
                  <p className="ae-megamenu__col-title">{section.title}</p>
                  {(section.items ?? []).map((item, itemIdx) => (
                    <Link
                      key={item.url || itemIdx}
                      href={item.url}
                      onClick={() => setMegaMenuOpen(false)}
                      className="ae-megamenu__item"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))
            ) : (
              <>
                <div>
                  <p className="ae-megamenu__col-title">Computational Silicon</p>
                  <Link href="/shop/cpu" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Flagship Processors
                  </Link>
                  <Link href="/shop/gpu" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Enterprise GPUs
                  </Link>
                  <Link href="/shop/motherboard" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Overclocking Mainboards
                  </Link>
                </div>

                <div>
                  <p className="ae-megamenu__col-title">Thermodynamic Cooling</p>
                  <Link href="/shop/cooling" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Custom Liquid Loops
                  </Link>
                  <Link href="/shop/case-fan" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Static Pressure Fans
                  </Link>
                  <Link href="/shop/cases" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Open-Frame Chassis
                  </Link>
                </div>

                <div>
                  <p className="ae-megamenu__col-title">Engineering Tools</p>
                  <Link href="/builder" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Interactive Rig Configurator
                  </Link>
                  <Link href="/shop/pre-built" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Pre-Validated Laboratory Builds
                  </Link>
                  <Link href="/explorer" onClick={() => setMegaMenuOpen(false)} className="ae-megamenu__item">
                    Hardware Slot Explorer
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* 4. Mobile Menu Drawer */}
      {mobileMenuOpen ? (
        <div className="ae-mobile-panel">
          <nav className="ae-mobile-nav">
            <Link
              href="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="ae-megamenu__item"
            >
              Hardware Shop
            </Link>
            <Link
              href="/builder"
              onClick={() => setMobileMenuOpen(false)}
              className="ae-megamenu__item"
            >
              PC Builder
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                onClick={() => setMobileMenuOpen(false)}
                className="ae-megamenu__item"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      {/* 5. ⌘K Search Modal */}
      <AetherSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

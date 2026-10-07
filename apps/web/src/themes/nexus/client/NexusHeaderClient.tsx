'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Box,
  ChevronDown,
  CircuitBoard,
  Cpu,
  Fan,
  Gauge,
  HardDrive,
  Menu,
  MemoryStick,
  Search,
  ShieldCheck,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import type { MegaMenuIcon, MegaMenuSection } from '@buildmyrig/plugin-pages'
import { Price } from '@/components/ui/Price'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccountNav } from '@/components/AccountNav'
import { WishlistNav } from '@/components/WishlistNav'
import { useCartDrawerStore } from '@/lib/cart-drawer-store'
import { playTickSound } from '../lib/audio'
import { NexusSearchModal } from './NexusSearchModal'
import { SOUND_STORAGE_KEY } from '../lib/audio'
import { useSyncExternalStore } from 'react'

type NavLink = { label: string; url: string }
type ThemeLabels = { altLabel: string; defaultLabel: string }

const ICONS: Record<MegaMenuIcon, typeof Cpu> = {
  speed: Gauge,
  cpu: Cpu,
  fan: Fan,
  memory: MemoryStick,
  'hard-drive': HardDrive,
  zap: Zap,
  box: Box,
  chip: CircuitBoard,
}

type CartShape = { items?: Array<{ quantity?: number }>; subtotal?: number }

/* ---------- sound toggle (bmr_sound, ThemeToggle useSyncExternalStore pattern) ---------- */

const soundSubscribe = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener('bmr_sound_change', cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener('bmr_sound_change', cb)
  }
}
const getSoundSnapshot = () => {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

function NexusSoundToggle() {
  const enabled = useSyncExternalStore(soundSubscribe, getSoundSnapshot, () => true)
  const toggle = () => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, enabled ? '0' : '1')
    } catch {
      // private mode — still flips for this session via the event below
    }
    window.dispatchEvent(new Event('bmr_sound_change'))
    playTickSound()
  }
  const label = enabled ? 'Mute haptic audio' : 'Enable haptic audio'
  return (
    <button
      type="button"
      className="nx-icon-btn"
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {enabled ? <Volume2 size={15} className="nx-accent" /> : <VolumeX size={15} />}
    </button>
  )
}

/* ---------- cart button + hover popover ---------- */

function NexusCartButton() {
  const { cart } = useCart() as { cart?: CartShape }
  const open = useCartDrawerStore((s) => s.open)
  const [hover, setHover] = useState(false)
  const count = (cart?.items ?? []).reduce((n, i) => n + (i.quantity ?? 1), 0)
  const subtotal = cart?.subtotal ?? 0

  return (
    <div
      className="nx-cart-wrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="nx-cart-btn"
        onClick={() => {
          playTickSound()
          open()
        }}
        aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
      >
        <span className="nx-cart-btn__icon">
          <ShoppingBag size={16} className="nx-accent" />
          {count > 0 && <span className="nx-cart-badge">{count}</span>}
        </span>
        <span className="nx-cart-btn__text">
          <span className="nx-cart-btn__label">Cart ({count})</span>
          <span className="nx-cart-btn__total">
            <Price cents={subtotal} />
          </span>
        </span>
      </button>
      {hover && count > 0 && (
        <div className="nx-cart-popover" role="status">
          <div className="nx-cart-popover__row">
            <span>{count} item{count === 1 ? '' : 's'}</span>
            <Price cents={subtotal} />
          </div>
          <Link href="/cart" className="nx-btn nx-btn--ghost nx-btn--sm">
            View cart
          </Link>
        </div>
      )}
    </div>
  )
}

/* ---------- mega menu flyout ---------- */

function MegaMenuPanel({ sections, onNavigate }: { sections: MegaMenuSection[]; onNavigate: () => void }) {
  return (
    <div className="nx-mega" role="dialog" aria-label="Catalog menu">
      {sections.map((section) => (
        <div key={section.title} className="nx-mega__section">
          <Link href={section.url} className="nx-mega__section-title" onClick={onNavigate}>
            {section.title}
          </Link>
          {section.description && <p className="nx-mega__section-desc">{section.description}</p>}
          <ul className="nx-mega__items">
            {section.items.map((item) => {
              const Icon = item.icon ? ICONS[item.icon] : null
              return (
                <li key={`${item.label}-${item.url}`}>
                  <Link href={item.url} className="nx-mega__item" onClick={onNavigate}>
                    {Icon && <Icon size={14} className="nx-accent" aria-hidden />}
                    <span className="nx-mega__item-text">
                      <span className="nx-mega__item-label">{item.label}</span>
                      {item.subtitle && <span className="nx-mega__item-sub">{item.subtitle}</span>}
                    </span>
                    {item.badge && <span className="nx-badge">{item.badge}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
          {section.featuredPromo && (
            <div className="nx-mega__promo">
              {section.featuredPromo.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- CMS media URL, remote-pattern-free
                <img src={section.featuredPromo.imageUrl} alt="" className="nx-mega__promo-img" />
              )}
              <p className="nx-mega__promo-title">{section.featuredPromo.title}</p>
              {section.featuredPromo.description && (
                <p className="nx-mega__promo-desc">{section.featuredPromo.description}</p>
              )}
              <Link
                href={section.featuredPromo.url}
                className="nx-btn nx-btn--primary nx-btn--sm"
                onClick={onNavigate}
              >
                {section.featuredPromo.buttonText}
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ---------- header client shell ---------- */

export function NexusHeaderClient({
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)

  const closeMenu = () => setMenuOpen(false)

  // Containment across BOTH the trigger and the flyout — the panel is a DOM
  // sibling of the trigger wrap (full-bleed bar below the header), so one ref
  // can't cover it. Without the panel ref, a mousedown on a menu link counts
  // as "outside" and unmounts the panel before the click dispatches.
  const isInMenu = (t: EventTarget | null): boolean =>
    t instanceof Node &&
    Boolean(menuWrapRef.current?.contains(t) || menuPanelRef.current?.contains(t))

  // Escape closes the flyout; clicks outside it too.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (!isInMenu(e.target)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [menuOpen])

  // ⌘K / Ctrl+K opens the search modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const hasMenu = megaMenu.length > 0

  return (
    <div className="nx-header" data-testid="nexus-header">
      {announcements.length > 0 && (
        <div className="nx-telemetry" aria-label="Announcements">
          <div className="nx-telemetry__inner">
            <span className="nx-telemetry__item nx-telemetry__item--live">
              <span className="nx-telemetry__dot" aria-hidden />
              {announcements[0]}
            </span>
            {announcements.slice(1).map((text, i) => (
              <span key={i} className="nx-telemetry__item">
                {text}
              </span>
            ))}
            <span className="nx-telemetry__item nx-telemetry__item--end">
              <ShieldCheck size={12} className="nx-accent" aria-hidden />
              CLEANROOM CALIBRATED
            </span>
          </div>
        </div>
      )}

      <div className="nx-bar">
        <Link href="/" className="nx-brand" onClick={() => playTickSound()}>
          <span className="nx-brand__mark">
            <Cpu size={16} aria-hidden />
          </span>
          <span className="nx-brand__text">
            <span className="nx-brand__name">
              Nexus<span className="nx-brand__light">Rig</span>
            </span>
            <span className="nx-brand__sub">Atelier Silicon</span>
          </span>
        </Link>

        <nav className="nx-nav" aria-label="Main">
          {navLinks.map((l, i) =>
            hasMenu && l.url === '/shop' ? (
              <div
                key={`${l.url}-${i}`}
                ref={menuWrapRef}
                className="nx-nav__menu-wrap"
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={(e) => {
                  // Leaving toward the flyout keeps it open; anywhere else closes.
                  if (!isInMenu(e.relatedTarget)) setMenuOpen(false)
                }}
              >
                <Link
                  href={l.url}
                  className="nx-nav__link nx-nav__link--menu"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  onClick={() => {
                    playTickSound()
                    closeMenu()
                  }}
                  onFocus={() => setMenuOpen(true)}
                  onBlur={(e) => {
                    if (!isInMenu(e.relatedTarget)) setMenuOpen(false)
                  }}
                >
                  {l.label}
                  <ChevronDown
                    size={12}
                    className={`nx-chevron${menuOpen ? ' nx-chevron--open' : ''}`}
                    aria-hidden
                  />
                </Link>
              </div>
            ) : (
              <Link
                key={`${l.url}-${i}`}
                href={l.url}
                className="nx-nav__link"
                onClick={() => playTickSound()}
              >
                {l.label}
              </Link>
            ),
          )}
          <Link href="/explorer" className="nx-nav__link nx-nav__link--accent" onClick={() => playTickSound()}>
            <CircuitBoard size={14} className="nx-accent" aria-hidden />
            Explorer
          </Link>
        </nav>

        <button
          type="button"
          className="nx-search-trigger"
          onClick={() => {
            playTickSound()
            setSearchOpen(true)
          }}
          aria-label="Search products"
        >
          <span className="nx-search-trigger__inner">
            <Search size={13} aria-hidden />
            <span>Search silicon, GPUs, cooling loops…</span>
          </span>
          <kbd className="nx-kbd">⌘K</kbd>
        </button>

        <div className="nx-actions">
          {themeLabels ? (
            <ThemeToggle altLabel={themeLabels.altLabel} defaultLabel={themeLabels.defaultLabel} />
          ) : null}
          <NexusSoundToggle />
          <AccountNav />
          <WishlistNav />
          <NexusCartButton />
          <button
            type="button"
            className="nx-icon-btn nx-burger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {menuOpen && hasMenu && (
        <div
          ref={menuPanelRef}
          onMouseLeave={(e) => {
            if (!isInMenu(e.relatedTarget)) setMenuOpen(false)
          }}
          onBlur={(e) => {
            // Keyboard: focus leaving the flyout (and not landing back on the
            // trigger) closes it — otherwise the panel hangs open visually.
            if (!isInMenu(e.relatedTarget)) setMenuOpen(false)
          }}
        >
          <MegaMenuPanel sections={megaMenu} onNavigate={closeMenu} />
        </div>
      )}

      {mobileOpen && (
        <nav className="nx-mobile" aria-label="Mobile">
          {navLinks.map((l, i) => (
            <Link
              key={`${l.url}-${i}`}
              href={l.url}
              className="nx-mobile__link"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/explorer" className="nx-mobile__link" onClick={() => setMobileOpen(false)}>
            Explorer
          </Link>
          {/* Header text links hide below 1024px — account/wishlist access
              lives in the burger menu on mobile. */}
          <span onClick={() => setMobileOpen(false)}>
            <AccountNav className="nx-mobile__link" />
          </span>
          <span onClick={() => setMobileOpen(false)}>
            <WishlistNav className="nx-mobile__link" />
          </span>
          <Link href="/checkout" className="nx-mobile__link nx-mobile__link--primary" onClick={() => setMobileOpen(false)}>
            Proceed to checkout
          </Link>
        </nav>
      )}

      <NexusSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

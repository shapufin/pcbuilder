'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type NavLink = { label: string; url: string }

/**
 * ≤768px navigation — hamburger toggle + full-screen drawer with the nav
 * links and the search form (the desktop bar hides both under the
 * breakpoint). Escape closes; the drawer only exists in the DOM while
 * open so screen readers never see a duplicate nav.
 */
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="mobile-nav__toggle"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '✕' : '☰'}
      </button>
      {open && (
        <nav id="mobile-nav-drawer" className="mobile-nav__drawer" aria-label="Mobile">
          {links.map((l, i) => (
            <Link key={`${l.url}-${i}`} href={l.url} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <form
            action="/shop/search"
            method="get"
            role="search"
            aria-label="Site search"
            className="site-search mobile-nav__search"
            onSubmit={() => setOpen(false)}
          >
            <input
              type="search"
              name="q"
              placeholder="Search products…"
              aria-label="Search products"
              className="site-search__input"
            />
            <button type="submit" className="site-search__btn">
              Search
            </button>
          </form>
        </nav>
      )}
    </>
  )
}

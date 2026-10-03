import Link from 'next/link'
import { CartBadge } from './CartBadge'
import { AccountNav } from './AccountNav'
import { WishlistNav } from './WishlistNav'
import { MobileNav } from './MobileNav'

type NavLink = { label: string; url: string }

/**
 * Phase-0 redesign: sticky blurred header extracted from the root layout's
 * inline-styled <header>. Desktop keeps the full nav + expanding search;
 * ≤768px collapses to MobileNav's drawer (cart stays in the bar).
 * e2e contracts kept: banner role carries Builder/Cart/Shop links and the
 * searchbox labelled "Search products".
 */
export function SiteHeader({ navLinks }: { navLinks: NavLink[] }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__logo">
          BuildMyRig
        </Link>
        <nav className="site-nav" aria-label="Main">
          {navLinks.map((l, i) => (
            <Link key={`${l.url}-${i}`} href={l.url}>
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/shop/search" method="get" role="search" aria-label="Site search" className="site-search">
          <input
            type="search"
            name="q"
            placeholder="Search…"
            aria-label="Search products"
            className="site-search__input"
          />
          <button type="submit" className="site-search__btn">
            Search
          </button>
        </form>
        <div className="site-header__actions">
          <AccountNav />
          <WishlistNav />
          <Link href="/cart" id="cart-anchor">
            Cart
            <CartBadge />
          </Link>
          <MobileNav links={navLinks} />
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const HREF = '/admin/build-stats'

/** Injected via admin.components.afterNavLinks — mirrors the native nav__link markup. */
export const BuildStatsNavLink: React.FC = () => {
  const pathname = usePathname() ?? ''
  const isActive = pathname.startsWith(HREF)
  return (
    <Link className="nav__link" href={HREF} id="nav-build-stats" prefetch={false}>
      {isActive && <div className="nav__link-indicator" />}
      <span className="nav__link-label">Build Stats</span>
    </Link>
  )
}

export default BuildStatsNavLink

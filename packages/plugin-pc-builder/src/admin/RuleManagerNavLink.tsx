'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const HREF = '/admin/compatibility-rules-manager'

/** Injected via admin.components.afterNavLinks — mirrors the native nav__link markup. */
export const RuleManagerNavLink: React.FC = () => {
  const pathname = usePathname() ?? ''
  const isActive = pathname.startsWith(HREF)
  return (
    <Link className="nav__link" href={HREF} id="nav-compatibility-rules" prefetch={false}>
      {isActive && <div className="nav__link-indicator" />}
      <span className="nav__link-label">Compatibility rules</span>
    </Link>
  )
}

export default RuleManagerNavLink

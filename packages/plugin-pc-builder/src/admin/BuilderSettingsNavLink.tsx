'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const HREF = '/admin/globals/builder-settings'

/** Injected via admin.components.afterNavLinks — direct link to the plugin's
 *  builder-settings global (design select for /builder/configure, entry 50). */
export const BuilderSettingsNavLink: React.FC = () => {
  const pathname = usePathname() ?? ''
  const isActive = pathname.startsWith(HREF)
  return (
    <Link className="nav__link" href={HREF} id="nav-builder-settings" prefetch={false}>
      {isActive && <div className="nav__link-indicator" />}
      <span className="nav__link-label">Builder Settings</span>
    </Link>
  )
}

export default BuilderSettingsNavLink

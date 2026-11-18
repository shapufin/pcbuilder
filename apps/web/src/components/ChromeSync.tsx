'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { syncChrome } from '@/lib/chrome'

/**
 * Keeps body[data-chrome] in step with client-side navigation (round-2 audit
 * F1). CHROME_BOOT_SCRIPT covers the initial full load pre-paint; this covers
 * every nav after — entering AND leaving the immersive builder route.
 */
export function ChromeSync() {
  const pathname = usePathname()
  useEffect(() => {
    syncChrome(pathname, document.body)
  }, [pathname])
  return null
}

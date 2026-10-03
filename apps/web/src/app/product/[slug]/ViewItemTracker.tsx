'use client'

import { useEffect } from 'react'
import { trackViewItem } from '@/lib/analytics'

/**
 * Fires the `view_item` funnel event once per product page mount (audit gap
 * P5-X3). The product page is a server component, so the view event needs
 * this tiny client island — `trackViewItem` no-ops without a configured
 * Plausible domain.
 */
export function ViewItemTracker({ item, priceCents }: { item: string; priceCents?: number }) {
  useEffect(() => {
    trackViewItem(item, priceCents)
  }, [item, priceCents])
  return null
}

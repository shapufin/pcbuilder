import { formatEUR } from '@buildmyrig/lib'

export { formatEUR }

/**
 * Single money formatter — replaces the hand-rolled `€{(x/100).toFixed(2)}`
 * copies across cart/checkout/account/drawer (web-interface-guidelines:
 * currency via Intl, tabular figures for comparisons).
 */
export function Price({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={className ? `price ${className}` : 'price'}>
      {formatEUR(cents)}
    </span>
  )
}

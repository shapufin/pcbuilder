const eur = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
})

/**
 * Single money formatter — replaces the hand-rolled `€{(x/100).toFixed(2)}`
 * copies across cart/checkout/account/drawer (web-interface-guidelines:
 * currency via Intl, tabular figures for comparisons).
 */
export function Price({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={className ? `price ${className}` : 'price'}>
      {eur.format(cents / 100)}
    </span>
  )
}

/** String form for places that need the formatted value, not markup. */
export function formatEUR(cents: number): string {
  return eur.format(cents / 100)
}

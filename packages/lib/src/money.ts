const eur = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
})

/**
 * Cents → grouped euro string ('129900' → '€1,299.00').
 * Single shared impl — storefront and emails both use it
 * (01-commerce.md: Intl > hand-rolled). Null-safe for
 * template interpolation; non-finite input formats as €0.00.
 */
export const formatEUR = (cents: number | null | undefined): string =>
  eur.format((typeof cents === 'number' && Number.isFinite(cents) ? cents : 0) / 100)

/** JSON-LD helpers (13-performance-seo.md). */

/** Escapes `<` so CMS text like `</script>` cannot break out of the inline script tag. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}

const origin = () => process.env.BMR_URL || 'http://localhost:3000'

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BuildMyRig',
    url: origin(),
    logo: `${origin()}/icon.svg`,
  }
}

export function productJsonLd(product: {
  title: string
  slug: string
  description?: string | null
  priceInEUR?: number | null
  brand?: { name?: string } | null
  category?: { title?: string; slug?: string } | null
  /** false = verified out of stock; true/undefined = in stock or untracked. */
  inStock?: boolean
}): Record<string, unknown> {
  const url = `${origin()}/product/${product.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    url,
    description: product.description ?? undefined,
    brand: product.brand?.name ? { '@type': 'Brand', name: product.brand.name } : undefined,
    category: product.category?.title ?? undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: ((product.priceInEUR ?? 0) / 100).toFixed(2),
      availability:
        product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url,
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${origin()}${item.url}`,
    })),
  }
}

export function itemListJsonLd(name: string, items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: `${origin()}${item.url}`,
    })),
  }
}

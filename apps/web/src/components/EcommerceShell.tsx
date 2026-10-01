'use client'

import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import { stripeAdapterClient } from '@payloadcms/plugin-ecommerce/payments/stripe'
import type { ReactNode } from 'react'

const cartApi = {
  cartsFetchQuery: {
    depth: 1,
    populate: { products: { title: true } },
  },
}

export function EcommerceShell({ children }: { children: ReactNode }) {
  const hasStripe = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  return (
    <EcommerceProvider
      // Entry-23 review F1: the plugin's base cart query is depth 0 with
      // populate.products restricted to the price field, so `item.product`
      // stays a raw id and every consumer (drawer, /cart, /checkout) fell
      // back to "Product". depth 1 populates the relationship; the merge
      // (deepMergeSimple) keeps the plugin's price/variants populate and
      // adds the title. Module-level identity keeps the provider's useMemo
      // deps stable across renders.
      api={cartApi}
      currenciesConfig={{
        supportedCurrencies: [{ code: 'EUR', decimals: 2, label: 'Euro', symbol: '€', symbolDisplay: 'symbol' }],
        defaultCurrency: 'EUR',
      }}
      enableVariants
      paymentMethods={hasStripe ? [stripeAdapterClient({ publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY! })] : []}
      syncLocalStorage
    >
      {children}
    </EcommerceProvider>
  )
}

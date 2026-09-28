'use client'

import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import { stripeAdapterClient } from '@payloadcms/plugin-ecommerce/payments/stripe'
import type { ReactNode } from 'react'

export function EcommerceShell({ children }: { children: ReactNode }) {
  const hasStripe = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  return (
    <EcommerceProvider
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

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STORE_SETTINGS,
  resolveStoreSettings,
} from './store-settings.ts'

describe('resolveStoreSettings', () => {
  it('falls back to DEFAULT_STORE_SETTINGS when passed null/undefined/empty', () => {
    expect(resolveStoreSettings(null)).toEqual(DEFAULT_STORE_SETTINGS)
    expect(resolveStoreSettings(undefined)).toEqual(DEFAULT_STORE_SETTINGS)
    expect(resolveStoreSettings({})).toEqual(DEFAULT_STORE_SETTINGS)
  })

  it('resolves valid custom threshold and promo banner config', () => {
    const doc = {
      freeShippingThresholdCents: 20000,
      promoBanner: {
        enabled: true,
        text: 'Black Friday Sale',
        link: '/shop',
        badgeText: '50% OFF',
        variant: 'accent',
        dismissible: false,
      },
      trustBadges: [
        { icon: 'shield', title: '5-Year Warranty', subtitle: 'VIP Coverage' },
      ],
    }

    const resolved = resolveStoreSettings(doc)
    expect(resolved.freeShippingThresholdCents).toBe(20000)
    expect(resolved.promoBanner.enabled).toBe(true)
    expect(resolved.promoBanner.text).toBe('Black Friday Sale')
    expect(resolved.promoBanner.link).toBe('/shop')
    expect(resolved.promoBanner.badgeText).toBe('50% OFF')
    expect(resolved.promoBanner.variant).toBe('accent')
    expect(resolved.promoBanner.dismissible).toBe(false)
    expect(resolved.trustBadges).toHaveLength(1)
    expect(resolved.trustBadges[0]?.title).toBe('5-Year Warranty')
    expect(resolved.features).toEqual(DEFAULT_STORE_SETTINGS.features)
  })

  it('resolves explicit custom plugin feature flags', () => {
    const doc = {
      features: {
        discountCodes: false,
        reviews: true,
        inventoryReservations: false,
        taxRates: true,
      },
    }
    const resolved = resolveStoreSettings(doc)
    expect(resolved.features.discountCodes).toBe(false)
    expect(resolved.features.reviews).toBe(true)
    expect(resolved.features.inventoryReservations).toBe(false)
    expect(resolved.features.taxRates).toBe(true)
  })
})

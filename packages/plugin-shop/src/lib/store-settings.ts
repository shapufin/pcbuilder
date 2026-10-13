export interface TrustBadgeItem {
  icon: string
  title: string
  subtitle: string
}

export interface PromoBannerConfig {
  enabled: boolean
  text: string
  link?: string
  badgeText?: string
  countdownEnd?: string
  variant?: 'accent' | 'neon' | 'dark' | 'gold'
  dismissible?: boolean
}

export interface PluginFeatureFlags {
  discountCodes: boolean
  reviews: boolean
  inventoryReservations: boolean
  taxRates: boolean
}

export interface StoreSettings {
  freeShippingThresholdCents: number
  promoBanner: PromoBannerConfig
  trustBadges: TrustBadgeItem[]
  features: PluginFeatureFlags
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  freeShippingThresholdCents: 15000, // €150.00
  promoBanner: {
    enabled: true,
    text: '⚡ FLASH SALE: Free express courier delivery on all custom rig builds above €150!',
    badgeText: 'LIMITED TIME',
    variant: 'neon',
    dismissible: true,
  },
  trustBadges: [
    {
      icon: 'shield-check',
      title: '3-Year Comprehensive Warranty',
      subtitle: 'Parts, labour, and return courier fully covered',
    },
    {
      icon: 'truck',
      title: '48h Priority Express Dispatch',
      subtitle: 'Secure double-boxed protective foam packaging',
    },
    {
      icon: 'cpu',
      title: '100% Component Compatibility',
      subtitle: 'Verified by our automated rule engine',
    },
    {
      icon: 'headphones',
      title: '24/7 Expert Rig Support',
      subtitle: 'Real hardware technicians on live chat and email',
    },
  ],
  features: {
    discountCodes: true,
    reviews: true,
    inventoryReservations: true,
    taxRates: true,
  },
}

export const resolveStoreSettings = (doc: unknown): StoreSettings => {
  if (!doc || typeof doc !== 'object') return DEFAULT_STORE_SETTINGS

  const d = doc as Record<string, unknown>
  const rawThreshold = d.freeShippingThresholdCents ?? d.freeShippingThresholdInEUR
  const freeShippingThresholdCents =
    typeof rawThreshold === 'number' && rawThreshold >= 0
      ? Math.round(rawThreshold)
      : DEFAULT_STORE_SETTINGS.freeShippingThresholdCents

  const rawPromo = d.promoBanner as Record<string, unknown> | undefined
  const promoBanner: PromoBannerConfig = rawPromo
    ? {
        enabled: Boolean(rawPromo.enabled),
        text: typeof rawPromo.text === 'string' && rawPromo.text.trim() ? rawPromo.text.trim() : DEFAULT_STORE_SETTINGS.promoBanner.text,
        link: typeof rawPromo.link === 'string' && rawPromo.link.trim() ? rawPromo.link.trim() : undefined,
        badgeText: typeof rawPromo.badgeText === 'string' ? rawPromo.badgeText.trim() : undefined,
        countdownEnd: typeof rawPromo.countdownEnd === 'string' ? rawPromo.countdownEnd : undefined,
        variant: ['accent', 'neon', 'dark', 'gold'].includes(String(rawPromo.variant))
          ? (rawPromo.variant as PromoBannerConfig['variant'])
          : 'neon',
        dismissible: rawPromo.dismissible !== false,
      }
    : DEFAULT_STORE_SETTINGS.promoBanner

  let trustBadges = DEFAULT_STORE_SETTINGS.trustBadges
  if (Array.isArray(d.trustBadges) && d.trustBadges.length > 0) {
    const valid = d.trustBadges
      .map((b) => {
        if (!b || typeof b !== 'object') return null
        const item = b as Record<string, unknown>
        if (typeof item.title !== 'string' || !item.title.trim()) return null
        return {
          icon: typeof item.icon === 'string' && item.icon.trim() ? item.icon.trim() : 'check',
          title: item.title.trim(),
          subtitle: typeof item.subtitle === 'string' ? item.subtitle.trim() : '',
        }
      })
      .filter((b): b is TrustBadgeItem => b !== null)

    if (valid.length > 0) trustBadges = valid
  }

  const rawFeatures = d.features as Record<string, unknown> | undefined
  const features: PluginFeatureFlags = {
    discountCodes: rawFeatures?.discountCodes !== false,
    reviews: rawFeatures?.reviews !== false,
    inventoryReservations: rawFeatures?.inventoryReservations !== false,
    taxRates: rawFeatures?.taxRates !== false,
  }

  return {
    freeShippingThresholdCents,
    promoBanner,
    trustBadges,
    features,
  }
}

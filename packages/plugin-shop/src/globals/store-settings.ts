import type { GlobalConfig } from 'payload'
import { isManager } from '../lib/access.ts'
import { DEFAULT_STORE_SETTINGS } from '../lib/store-settings.ts'

export const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: 'Store & Merchandising',
  admin: {
    description: 'Control storewide promotions, free shipping thresholds, and trust guarantees.',
    group: 'Store',
  },
  access: {
    read: () => true,
    update: ({ req }) => isManager(req.user as never),
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Free Shipping & Thresholds',
          fields: [
            {
              name: 'freeShippingThresholdCents',
              type: 'number',
              label: 'Free Shipping Threshold (EUR Cents)',
              defaultValue: DEFAULT_STORE_SETTINGS.freeShippingThresholdCents,
              min: 0,
              required: true,
              admin: {
                description: 'Cents (e.g. 15000 = €150.00). In-cart meter calculates progress towards this amount.',
              },
            },
          ],
        },
        {
          label: 'Promotional Top Banner',
          fields: [
            {
              name: 'promoBanner',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'enabled', type: 'checkbox', defaultValue: DEFAULT_STORE_SETTINGS.promoBanner.enabled, admin: { width: '50%' } },
                    { name: 'dismissible', type: 'checkbox', defaultValue: DEFAULT_STORE_SETTINGS.promoBanner.dismissible, admin: { width: '50%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'text', type: 'text', label: 'Banner Announcement Text', required: true, defaultValue: DEFAULT_STORE_SETTINGS.promoBanner.text, admin: { width: '70%' } },
                    { name: 'badgeText', type: 'text', label: 'Badge Label', defaultValue: DEFAULT_STORE_SETTINGS.promoBanner.badgeText, admin: { width: '30%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'link', type: 'text', label: 'Click Link (optional URL)', admin: { width: '50%' } },
                    {
                      name: 'variant',
                      type: 'select',
                      label: 'Visual Style',
                      defaultValue: 'neon',
                      options: [
                        { label: '🌌 Cyber Neon Glow', value: 'neon' },
                        { label: '⚡ Accent Solid', value: 'accent' },
                        { label: '🖤 Sleek Dark Surface', value: 'dark' },
                        { label: '✨ Gold Edition', value: 'gold' },
                      ],
                      admin: { width: '50%' },
                    },
                  ],
                },
                {
                  name: 'countdownEnd',
                  type: 'date',
                  label: 'Countdown Timer End Date (Optional)',
                  admin: {
                    description: 'If set, displays an interactive live ticking countdown in the banner.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Trust & Guarantees',
          fields: [
            {
              name: 'trustBadges',
              type: 'array',
              label: 'Store Guarantees',
              defaultValue: DEFAULT_STORE_SETTINGS.trustBadges,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'icon', type: 'text', label: 'Icon Name', required: true, admin: { width: '30%', description: 'e.g. shield-check, truck, cpu, headphones' } },
                    { name: 'title', type: 'text', label: 'Guarantee Title', required: true, admin: { width: '70%' } },
                  ],
                },
                { name: 'subtitle', type: 'text', label: 'Details / Description' },
              ],
            },
          ],
        },
        {
          label: 'Modular Features & Extensions',
          fields: [
            {
              name: 'features',
              type: 'group',
              label: 'Feature Toggles',
              admin: {
                description: 'Enable or disable modular commerce features across the admin interface and storefront.',
              },
              fields: [
                {
                  name: 'discountCodes',
                  type: 'checkbox',
                  label: 'Discount Codes & Promotions Plugin',
                  defaultValue: DEFAULT_STORE_SETTINGS.features.discountCodes,
                  admin: {
                    description: 'Enable promotional coupon codes, voucher discounts, and checkout coupon entry.',
                  },
                },
                {
                  name: 'reviews',
                  type: 'checkbox',
                  label: 'Product Reviews & Ratings Plugin',
                  defaultValue: DEFAULT_STORE_SETTINGS.features.reviews,
                  admin: {
                    description: 'Enable customer review submissions, star ratings, and moderation.',
                  },
                },
                {
                  name: 'inventoryReservations',
                  type: 'checkbox',
                  label: 'Inventory Reservations & Cart Holds Plugin',
                  defaultValue: DEFAULT_STORE_SETTINGS.features.inventoryReservations,
                  admin: {
                    description: 'Hold stock for 15 minutes when items are in cart to eliminate checkout race conditions.',
                  },
                },
                {
                  name: 'taxRates',
                  type: 'checkbox',
                  label: 'Dynamic Tax Rates & Regional VAT Engine Plugin',
                  defaultValue: DEFAULT_STORE_SETTINGS.features.taxRates,
                  admin: {
                    description: 'Enable country-specific destination VAT calculation and tax breakdown tables.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

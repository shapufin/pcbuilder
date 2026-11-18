import type { Block } from 'payload'
import { isSafeNavLinkUrl } from '../lib/site-settings.ts'

export const BannerCountdownBlock: Block = {
  slug: 'bannerCountdown',
  interfaceName: 'BannerCountdownBlock',
  labels: {
    singular: 'Promo Countdown Banner',
    plural: 'Promo Countdown Banners',
  },
  admin: { group: 'Commerce' },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'badgeText', type: 'text', label: 'Badge (e.g. FLASH DEAL)', defaultValue: 'LIMITED EVENT', admin: { width: '40%' } },
        { name: 'countdownEnd', type: 'date', label: 'Countdown Target Date & Time', required: true, admin: { width: '60%' } },
      ],
    },
    { name: 'heading', type: 'text', label: 'Headline', required: true, defaultValue: 'Special Launch Event' },
    { name: 'subheading', type: 'textarea', label: 'Subheading / Details', defaultValue: 'Upgrade your battle station with bonus accessories and free insured shipping.' },
    {
      type: 'row',
      fields: [
        { name: 'ctaLabel', type: 'text', label: 'CTA Button Label', defaultValue: 'Configure Rig Now', admin: { width: '50%' } },
        {
          name: 'ctaUrl',
          type: 'text',
          label: 'CTA Target URL',
          defaultValue: '/builder',
          admin: { width: '50%' },
          validate: (value: unknown) => {
            if (!value || typeof value !== 'string') return true
            return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
          },
        },
      ],
    },
    {
      name: 'variant',
      type: 'select',
      label: 'Visual Gradient Theme',
      defaultValue: 'cyber-neon',
      options: [
        { label: 'Cyber Neon Glow', value: 'cyber-neon' },
        { label: 'Precision Accent', value: 'precision-accent' },
        { label: 'Dark Stealth', value: 'dark-stealth' },
        { label: 'Golden Edition', value: 'golden-edition' },
      ],
    },
  ],
}

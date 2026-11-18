import type { Block } from 'payload'
import { isSafeNavLinkUrl } from '../lib/site-settings.ts'

/**
 * Entry 124 (Aether) — high-compute PC hardware laboratory hero ported from SHOP_THEME_2.tsx:
 * Telemetry badge + heading with accent highlight + dual engineering CTAs
 * + live thermal & hardware telemetry summary metrics.
 */
export const AetherHeroBlock: Block = {
  slug: 'aetherHero',
  interfaceName: 'AetherHeroBlock',
  labels: {
    singular: 'Aether Lab Hero',
    plural: 'Aether Lab Heroes',
  },
  admin: { group: 'Aether' },
  fields: [
    {
      name: 'badge',
      type: 'text',
      defaultValue: 'ZURICH HIGH-COMPUTE WORKSTATION LAB // BATCH 5090 READY',
      maxLength: 160,
      admin: { description: 'Telemetry strip banner above heading.' },
    },
    { name: 'heading', type: 'text', required: true, defaultValue: 'Liquid-Cooled Workstations & Extreme PC Hardware' },
    {
      name: 'highlightText',
      type: 'text',
      defaultValue: 'Extreme PC Hardware',
      admin: { description: 'Word(s) rendered in the Amber/Gold accent gradient.' },
    },
    {
      name: 'body',
      type: 'textarea',
      defaultValue: 'Every GPU, custom loop and rig ships with an individual 24-hour thermal telemetry run-in certificate and silicon binning report.',
    },
    {
      name: 'ctas',
      type: 'array',
      labels: {
        singular: 'Action Button',
        plural: 'Action Buttons',
      },
      admin: { initCollapsed: true },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: unknown) => {
            if (typeof value !== 'string' || !value.trim()) return 'URL is required'
            return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
          },
        },
        { name: 'style', type: 'select', options: ['primary', 'outline', 'ghost'], defaultValue: 'primary' },
      ],
    },
    {
      name: 'telemetryMetrics',
      type: 'array',
      labels: {
        singular: 'Telemetry Metric',
        plural: 'Telemetry Metrics',
      },
      admin: { initCollapsed: true },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'delta', type: 'text' },
      ],
    },
  ],
}

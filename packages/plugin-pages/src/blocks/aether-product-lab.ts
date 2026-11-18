import type { Block } from 'payload'

/**
 * Entry 124 (Aether) — 3D & X-Ray single product laboratory ported from SHOP_THEME_2.tsx:
 * Interactive component inspection with live thermal delta, SP score, acoustic floor,
 * and silicon binning diagnostics.
 */
export const AetherProductLabBlock: Block = {
  slug: 'aetherProductLab',
  interfaceName: 'AetherProductLabBlock',
  admin: { group: 'Aether' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'HARDWARE TELEMETRY LAB' },
    { name: 'heading', type: 'text', required: true, defaultValue: 'Interactive Hardware & Thermal Telemetry' },
    { name: 'subtitle', type: 'textarea', defaultValue: 'Inspect custom waterblocks, die contact pressure, and silicon binning grades before configuration.' },
    {
      name: 'categorySlug',
      type: 'text',
      defaultValue: 'gpu',
      admin: { description: 'Target category to pull featured hardware products from.' },
    },
    {
      name: 'showBenchmarkTelemetry',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Render telemetry cards (SP Score, Thermal Delta, Acoustic Floor, Golden Bin).' },
    },
  ],
}

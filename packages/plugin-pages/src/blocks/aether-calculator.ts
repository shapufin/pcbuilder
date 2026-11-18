import type { Block } from 'payload'

/**
 * aetherCalculator (entry 125) — interactive delid delta & liquid cooling
 * thermal calculator for custom loop workstation planning.
 */
export const aetherCalculatorBlock: Block = {
  slug: 'aetherCalculator',
  interfaceName: 'AetherCalculatorBlock',
  labels: {
    singular: 'Aether Thermal Calculator',
    plural: 'Aether Thermal Calculators',
  },
  admin: {
    group: 'Aether',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      defaultValue: 'THERMAL COMPUTATION ENGINE',
      admin: { description: 'Small uppercase header tag' },
    },
    {
      name: 'heading',
      type: 'text',
      required: true,
      defaultValue: 'Delid Delta & Radiator Thermal Headroom Calculator',
    },
    {
      name: 'subtitle',
      type: 'text',
      defaultValue: 'Simulate junction delta-T across coldplate metallurgy and radiator surface area.',
    },
    {
      name: 'defaultCpuTdp',
      type: 'number',
      defaultValue: 300,
      admin: { description: 'Default CPU target load in Watts' },
    },
    {
      name: 'defaultGpuTdp',
      type: 'number',
      defaultValue: 600,
      admin: { description: 'Default GPU target load in Watts' },
    },
    {
      name: 'showDelidComparison',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Enable direct-die delid comparison toggles' },
    },
  ],
}

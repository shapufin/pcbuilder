import type { Block } from 'payload'

/**
 * aetherLoopVisualizer (entry 125) — interactive 3D / schematic custom loop
 * fluid, manifold, and tubing explorer block.
 */
export const aetherLoopVisualizerBlock: Block = {
  slug: 'aetherLoopVisualizer',
  interfaceName: 'AetherLoopVisualizerBlock',
  labels: {
    singular: 'Aether Loop Visualizer',
    plural: 'Aether Loop Visualizers',
  },
  admin: {
    group: 'Aether',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      defaultValue: 'CUSTOM WATERBLOCK & MANIFOLD ARCHITECTURE',
      admin: { description: 'Small uppercase header tag' },
    },
    {
      name: 'heading',
      type: 'text',
      required: true,
      defaultValue: 'Interactive Fluid Dynamics & Distribution Block Explorer',
    },
    {
      name: 'subtitle',
      type: 'text',
      defaultValue: 'Inspect CNC-milled acrylic manifolds, brass fittings, and sub-ambient fluid profiles.',
    },
    {
      name: 'defaultCoolant',
      type: 'select',
      defaultValue: 'cyan',
      options: [
        { label: 'Cryo Cyan Non-Conductive', value: 'cyan' },
        { label: 'Amber Gold Telemetry', value: 'amber' },
        { label: 'Pure Distilled Clear', value: 'clear' },
        { label: 'UV Reactive Emerald', value: 'emerald' },
      ],
    },
    {
      name: 'defaultTubing',
      type: 'select',
      defaultValue: 'brass',
      options: [
        { label: 'Mirror Polished Brass', value: 'brass' },
        { label: 'Frosted Hardline Acrylic (16mm)', value: 'acrylic' },
        { label: 'Industrial Matte Black EPDM', value: 'epdm' },
      ],
    },
    {
      name: 'showFlowRateControl',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}

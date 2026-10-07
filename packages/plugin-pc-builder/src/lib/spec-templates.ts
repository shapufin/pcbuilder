/**
 * Per-category cosmetic-spec vocabulary (spec §A, entry 68).
 *
 * `specsJson` stays a JSON field on `components` — this registry is the known
 * key set per category, used by the admin SpecFieldsField form, by
 * `specLabel()` for builder/PDP display labels, and by the seed drift-guard
 * test. Adding a spec key = one entry here, no schema migration.
 *
 * Keys mirror the seeded vocabulary exactly — the drift-guard test pins that.
 */

export type SpecFieldType = 'number' | 'text' | 'select' | 'multiselect' | 'boolean'

export interface SpecFieldDef {
  key: string
  label: string
  type: SpecFieldType
  /** Display suffix, e.g. 'GB', 'mm', 'MHz' — appended when rendering values. */
  unit?: string
  /** Allowed values for select/multiselect fields. */
  options?: string[]
}

export const SPEC_TEMPLATES: Record<string, SpecFieldDef[]> = {
  cpu: [
    { key: 'cores', label: 'Cores', type: 'number' },
    { key: 'threads', label: 'Threads', type: 'number' },
    { key: 'clockBoostGhz', label: 'Boost clock', type: 'number', unit: 'GHz' },
    { key: 'cacheL3Mb', label: 'L3 cache', type: 'number', unit: 'MB' },
  ],
  motherboard: [
    { key: 'chipset', label: 'Chipset', type: 'text' },
    { key: 'wifi', label: 'Wi-Fi', type: 'text' },
  ],
  ram: [
    { key: 'kitGb', label: 'Kit capacity', type: 'number', unit: 'GB' },
    { key: 'casLatency', label: 'CAS latency', type: 'number', unit: 'CL' },
  ],
  gpu: [
    { key: 'vram', label: 'VRAM', type: 'number', unit: 'GB' },
    { key: 'boostMhz', label: 'Boost clock', type: 'number', unit: 'MHz' },
    { key: 'peakDrawW', label: 'Peak draw', type: 'number', unit: 'W' },
  ],
  storage: [
    { key: 'capacityTb', label: 'Capacity', type: 'number', unit: 'TB' },
    { key: 'readMbps', label: 'Sequential read', type: 'number', unit: 'MB/s' },
  ],
  psu: [
    {
      key: 'efficiency',
      label: 'Efficiency rating',
      type: 'select',
      options: ['80+ Bronze', '80+ Gold', '80+ Platinum', '80+ Titanium'],
    },
    {
      key: 'modularity',
      label: 'Modularity',
      type: 'select',
      options: ['Non-modular', 'Semi-modular', 'Fully modular'],
    },
    { key: 'fanSizeMm', label: 'Fan size', type: 'number', unit: 'mm' },
  ],
  case: [{ key: 'frontFanMounts', label: 'Front fan mounts', type: 'number' }],
  cooling: [
    { key: 'radSizeMm', label: 'Radiator size', type: 'number', unit: 'mm' },
    { key: 'fanCount', label: 'Fans', type: 'number' },
    { key: 'noiseDbA', label: 'Noise', type: 'number', unit: 'dBA' },
  ],
  'case-fan': [
    { key: 'fanSizeMm', label: 'Fan size', type: 'number', unit: 'mm' },
    { key: 'noiseDbA', label: 'Noise', type: 'number', unit: 'dBA' },
  ],
  os: [],
}

/** Template fields for a component-category slug ([] when the category has none). */
export const specTemplateFor = (categorySlug: string): SpecFieldDef[] =>
  SPEC_TEMPLATES[categorySlug] ?? []

/** Display label + unit for a spec key; falls back to the raw key when unmapped. */
export const specLabel = (categorySlug: string, key: string): { label: string; unit?: string } => {
  const def = specTemplateFor(categorySlug).find((f) => f.key === key)
  if (!def) return { label: key }
  return def.unit ? { label: def.label, unit: def.unit } : { label: def.label }
}

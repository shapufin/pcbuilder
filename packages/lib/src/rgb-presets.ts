/**
 * RGB accent values for builder designs (entry 50). Hex literals live HERE —
 * apps/web bans raw hex in src/** (no-raw-hex ESLint + css-token-purity), so
 * the zod schema default, the zustand store and the design swatches share
 * this one source. Values mirror the RIG_model1 COLOR_PRESETS swatches.
 */
export const DEFAULT_RGB_ACCENT = '#7df4ff'

export const RGB_PRESETS = [
  { name: 'Cyber Cyan', hex: '#7df4ff' },
  { name: 'Ice Blue', hex: '#38bdf8' },
  { name: 'Tokyo Violet', hex: '#d0bcff' },
  { name: 'Orange Ember', hex: '#fb923c' },
  { name: 'Neon Coral', hex: '#f43f5e' },
  { name: 'Stealth Carbon', hex: '#475569' },
] as const

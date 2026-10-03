import { describe, expect, it } from 'vitest'
import { BUILDER_DESIGNS, DEFAULT_BUILDER_DESIGN } from '@buildmyrig/plugin-pc-builder'
import { BUILDER_DESIGN_COMPONENTS } from '../designs'

/**
 * Parity (entry 50 P2): le chiavi del registry componenti devono coincidere
 * esattamente con gli slug registrati nel plugin — un design dimenticato
 * (o un refuso nello slug) farebbe cadere il fallback su rig-studio senza
 * nessun errore visibile. Stesso pattern di #288 (THEME_PRESETS).
 */
describe('builder designs registry', () => {
  it('#331 le chiavi del registry componenti == le chiavi di BUILDER_DESIGNS', () => {
    expect(Object.keys(BUILDER_DESIGN_COMPONENTS).sort()).toEqual(
      Object.keys(BUILDER_DESIGNS).sort(),
    )
  })

  it('#364 il fallback del shell risolve un componente reale (DEFAULT_BUILDER_DESIGN)', () => {
    // BuilderShell cade su BUILDER_DESIGN_COMPONENTS[DEFAULT_BUILDER_DESIGN] —
    // una chiave scritta male (es. 'rigStudio') darebbe un fallback undefined.
    expect(BUILDER_DESIGN_COMPONENTS[DEFAULT_BUILDER_DESIGN]).toBeDefined()
  })
})

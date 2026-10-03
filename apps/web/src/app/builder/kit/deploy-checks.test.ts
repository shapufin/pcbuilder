import { describe, expect, it } from 'vitest'
import { checkCompatibility, checkPowerEnvelope } from './deploy-checks'

/**
 * Entry 50 P4 (#356+): the Deploy pipeline's real gates — stage 1 runs the
 * engine's validateSelections + required-slot check; stage 2 the derived
 * power envelope. Pure functions so every design reuses the same verdicts.
 */

describe('deploy-checks — entry 50 P4', () => {
  it('#356 checkCompatibility: missing required slots + validation errors block; warnings only note', () => {
    const blocked = checkCompatibility({
      missingRequired: [{ name: 'Graphics Card' }],
      validation: {
        errors: [{ ruleId: 'r1', severity: 'error', message: 'socket mismatch' }],
        warnings: [{ ruleId: 'r2', severity: 'warning', message: 'tight PSU' }],
      },
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.blockers).toEqual(
      expect.arrayContaining([expect.stringContaining('Graphics Card'), 'socket mismatch']),
    )
    expect(blocked.notes).toContain('tight PSU')

    const clean = checkCompatibility({
      missingRequired: [],
      validation: { errors: [], warnings: [{ ruleId: 'r2', severity: 'warning', message: 'tight PSU' }] },
    })
    expect(clean.ok).toBe(true)
    expect(clean.blockers).toEqual([])
    expect(clean.notes).toContain('tight PSU')
  })

  it('#365 checkCompatibility: over-limit picks block stage 1 (import bypasses client caps → server 422s at save)', () => {
    const over = checkCompatibility({
      missingRequired: [],
      validation: { errors: [], warnings: [] },
      overLimit: ['Memory: 3 installed, max 2'],
    })
    expect(over.ok).toBe(false)
    expect(over.blockers).toContain('Memory: 3 installed, max 2')
  })

  it('#357 checkPowerEnvelope: error-severity warnings block; warnings note; no PSU is a note', () => {
    const blocked = checkPowerEnvelope({
      recommendedPsuWatts: 700,
      psuRatedWatts: 550,
      powerWarnings: [{ severity: 'error', message: 'PSU undersized: 700W required' }],
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.blockers).toContain('PSU undersized: 700W required')

    const warned = checkPowerEnvelope({
      recommendedPsuWatts: 700,
      psuRatedWatts: 750,
      powerWarnings: [{ severity: 'warning', message: 'A 750W PSU is tight' }],
    })
    expect(warned.ok).toBe(true)
    expect(warned.notes).toContain('A 750W PSU is tight')
    expect(warned.notes).toContain('700W required of 750W rated')

    const noPsu = checkPowerEnvelope({
      recommendedPsuWatts: 480,
      psuRatedWatts: null,
      powerWarnings: [],
    })
    expect(noPsu.ok).toBe(true)
    expect(noPsu.notes).toContain('No PSU selected — wattage unverified')
  })
})

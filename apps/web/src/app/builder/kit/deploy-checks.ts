import type { SelectionValidation } from '@buildmyrig/lib'

/**
 * Design kit (entry 50 P4): the Deploy pipeline's real gates as pure checks —
 * stage 1 compatibility (required slots + engine validateSelections) and
 * stage 2 power envelope (derived-power warnings + rated PSU). Every design
 * reuses the same verdicts; stages 3 (save) and 4 (cart) are real async ops.
 */

export interface DeployCheckResult {
  /** false → the stage FAILED and the pipeline halts. */
  ok: boolean
  /** Reasons a failed stage surfaces verbatim. */
  blockers: string[]
  /** Non-blocking facts rendered under a passed stage. */
  notes: string[]
}

export const checkCompatibility = (input: {
  missingRequired: { name: string }[]
  validation: SelectionValidation
  /** Picks over the resolved cap — import/hydration can bypass client caps
   *  and the save endpoint 422s them; surfacing at stage 1 is the honest
   *  gate (a stage-3 "save failed" would hide the real reason). */
  overLimit?: string[]
}): DeployCheckResult => ({
  ok:
    input.missingRequired.length === 0 &&
    input.validation.errors.length === 0 &&
    (input.overLimit?.length ?? 0) === 0,
  blockers: [
    ...input.missingRequired.map((c) => `Required slot empty: ${c.name}`),
    ...(input.overLimit ?? []),
    ...input.validation.errors.map((e) => e.message),
  ],
  notes: input.validation.warnings.map((w) => w.message),
})

export const checkPowerEnvelope = (input: {
  recommendedPsuWatts: number
  psuRatedWatts: number | null
  powerWarnings: { severity: string; message: string }[]
}): DeployCheckResult => {
  const blockers = input.powerWarnings
    .filter((w) => w.severity === 'error')
    .map((w) => w.message)
  const notes = input.powerWarnings
    .filter((w) => w.severity !== 'error')
    .map((w) => w.message)
  if (input.psuRatedWatts === null) {
    notes.push('No PSU selected — wattage unverified')
  } else {
    notes.push(`${input.recommendedPsuWatts}W required of ${input.psuRatedWatts}W rated`)
  }
  return { ok: blockers.length === 0, blockers, notes }
}

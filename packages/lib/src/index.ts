/**
 * @buildmyrig/lib — pure, framework-free shared logic.
 * Phase 2 adds the rule engine (docs/buildmyrig-plan/06-rule-engine.md).
 */
export const powerRequired = (tdpSumWatts: number, multiplier = 1.3, baseWatts = 100): number =>
  Math.round(tdpSumWatts * multiplier + baseWatts)

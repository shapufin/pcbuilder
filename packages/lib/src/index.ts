/**
 * @buildmyrig/lib — pure, framework-free shared logic.
 */
export const powerRequired = (tdpSumWatts: number, multiplier = 1.3, baseWatts = 100): number =>
  Math.round(tdpSumWatts * multiplier + baseWatts)

export * from './rule-engine'

/**
 * Save-race guards for useBuildActions (entry-55 review M1): the decisions
 * that protect save-to-store stamping and in-flight request reuse, extracted
 * as pure functions so the race semantics are unit-testable.
 *
 * The draft signature identifies a set of selections; selection mutations
 * clear buildId/shareId in the store, so a signature change always implies
 * the refs were cleared. Key-order differences in JSON.stringify can only
 * fail closed (a stamp is skipped), never stamp a mismatched doc.
 */

export const draftSignature = (selections: Record<string, string[]>): string =>
  JSON.stringify(selections)

/** Stamp the response's refs only when the live draft still matches the
 *  snapshot the POST was built from AND nothing newer stamped meanwhile. */
export const shouldApplySavedBuild = (
  current: { buildId: unknown; selections: Record<string, string[]> },
  signature: string,
): boolean => current.buildId == null && draftSignature(current.selections) === signature

export interface InflightSave {
  signature: string
}

/** Reuse an in-flight POST only while the draft hasn't changed since it was
 *  issued — a changed draft must start a fresh save so the caller never
 *  receives refs describing a different configuration. */
export const canReuseInflight = (
  inflight: InflightSave | null,
  signature: string,
): boolean => inflight !== null && inflight.signature === signature

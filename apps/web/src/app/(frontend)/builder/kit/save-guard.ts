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

export type CartView = 'idle' | 'adding' | 'added' | 'error'

/** What the UI may show for the cart action. 'added' is only honest while the
 *  draft it described still exists — a selection edit clears buildId/shareId,
 *  so the flag collapses back to 'idle' (same staleness rule as saveView;
 *  round-2 audit F2: a stale 'added' hid the re-add path in CommissionSheet). */
export const cartViewFor = (cartState: CartView, hasSavedDraft: boolean): CartView =>
  cartState === 'added' && !hasSavedDraft ? 'idle' : cartState

/** The rename PATCH runs only for an authed user changing to a non-blank,
 *  different name — guests can't write owner-scoped docs and a same-name
 *  PATCH is a no-op round-trip. */
export const shouldRename = (
  live: { buildName?: string | null },
  trimmedName: string | undefined,
  hasUser: boolean,
): boolean => Boolean(trimmedName?.trim() && trimmedName !== live.buildName && hasUser)

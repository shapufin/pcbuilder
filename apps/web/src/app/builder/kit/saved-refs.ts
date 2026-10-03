/**
 * Design kit (entry 50 P4): guest saved-build refs — localStorage pointers to
 * real server drafts. Guests own no configured-builds docs, so the modal
 * keeps {shareId, name, savedAt, priceCents} refs under `bmr_studio_builds`;
 * Load resolves the share endpoint, Delete just drops the ref.
 */

export const SAVED_BUILDS_KEY = 'bmr_studio_builds'

export interface SavedBuildRef {
  shareId: string
  name?: string
  savedAt: number
  priceCents: number
}

/** Never-throw: null/garbage/non-array → []; malformed entries are filtered. */
export const parseSavedRefs = (raw: string | null): SavedBuildRef[] => {
  if (!raw) return []
  let doc: unknown
  try {
    doc = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(doc)) return []
  return doc.filter(
    (r): r is SavedBuildRef =>
      typeof r === 'object' &&
      r !== null &&
      typeof (r as SavedBuildRef).shareId === 'string' &&
      (r as SavedBuildRef).shareId.length > 0 &&
      typeof (r as SavedBuildRef).savedAt === 'number' &&
      typeof (r as SavedBuildRef).priceCents === 'number' &&
      ((r as SavedBuildRef).name === undefined || typeof (r as SavedBuildRef).name === 'string'),
  )
}

/**
 * Insert-or-replace by shareId, newest first. An incoming ref without `name`
 * preserves the stored one — silent saves (deploy/add-to-cart) must not clobber
 * a name the user typed.
 */
export const addSavedRef = (refs: SavedBuildRef[], ref: SavedBuildRef): SavedBuildRef[] => {
  const existing = refs.find((r) => r.shareId === ref.shareId)
  const merged: SavedBuildRef = { ...existing, ...ref, name: ref.name ?? existing?.name }
  return [merged, ...refs.filter((r) => r.shareId !== ref.shareId)]
}

export const removeSavedRef = (refs: SavedBuildRef[], shareId: string): SavedBuildRef[] =>
  refs.filter((r) => r.shareId !== shareId)

/** Read the ref list — never-throw (SSR, blocked storage, corrupt JSON). */
export const loadSavedRefs = (): SavedBuildRef[] => {
  try {
    return parseSavedRefs(window.localStorage.getItem(SAVED_BUILDS_KEY))
  } catch {
    return []
  }
}

/** Persist the ref list — never-throw (private mode / quota). */
export const storeSavedRefs = (refs: SavedBuildRef[]): void => {
  try {
    window.localStorage.setItem(SAVED_BUILDS_KEY, JSON.stringify(refs))
  } catch {
    /* storage unavailable — refs degrade to session-only */
  }
}

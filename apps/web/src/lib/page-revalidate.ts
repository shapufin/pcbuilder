/**
 * Phase 4 / task 4.1 — when a page save should bust the ISR cache.
 *
 * Payload runs collection `afterChange` hooks on autosave saves too (there is
 * no autosave guard around the hook loop in
 * `payload/dist/collections/operations/utilities/update.js`), and the admin's
 * autosave element PATCHes every ~800ms while the editor types. The public
 * page only ever renders the published row, so revalidating on a draft
 * autosave discards the cached page on every keystroke and gains nothing.
 *
 * Revalidate when the document is publicly visible after the save, or was
 * before it — the second case is an unpublish, which must stop serving.
 */
type StatusDoc = { _status?: string | null } | null | undefined

const isPublished = (doc: StatusDoc): boolean =>
  // Collections without drafts have no `_status` at all — those saves are live.
  doc === undefined || doc === null ? false : doc._status === undefined || doc._status === 'published'

export const shouldRevalidatePage = ({
  doc,
  previousDoc,
}: {
  doc: StatusDoc
  previousDoc?: StatusDoc
}): boolean => isPublished(doc) || isPublished(previousDoc)

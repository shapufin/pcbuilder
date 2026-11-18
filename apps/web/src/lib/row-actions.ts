/**
 * Phase 4 / task 4.2 — what the list row's delete action should actually do.
 *
 * Payload's own delete button never calls `DELETE` on a trash-enabled
 * collection: it PATCHes `{ deletedAt }` and only hard-deletes when the user
 * holds the permanent-delete permission
 * (`@payloadcms/ui/dist/elements/DeleteDocument/index.js`). The row action we
 * inject on every list predates trash and always hard-deletes, so without this
 * decision the most-used delete affordance would silently bypass recovery.
 *
 * Pure so the three cases stay testable — the component has no DOM test
 * harness in this repo (tests render to static markup).
 */
export type RowDeletePlan =
  | { kind: 'hidden' }
  | {
      kind: 'permanent'
      method: 'DELETE'
      url: string
      description: string
      confirmLabel: string
      successTitle: string
    }
  | {
      kind: 'trash'
      method: 'PATCH'
      url: string
      body: { deletedAt: string }
      description: string
      confirmLabel: string
      successTitle: string
    }

export const rowDeletePlan = ({
  collectionSlug,
  id,
  trash,
  viewType,
  now = new Date(),
}: {
  collectionSlug: string
  id?: unknown
  trash?: boolean
  viewType?: string
  now?: Date
}): RowDeletePlan => {
  // Restoring lives in the document view / bulk actions; deleting from the
  // trash view would be a permanent delete wearing a trash icon.
  if (viewType === 'trash') return { kind: 'hidden' }
  if (id === undefined || id === null || id === '') return { kind: 'hidden' }

  const url = `/api/${collectionSlug}/${encodeURIComponent(String(id))}`

  if (trash === true) {
    return {
      kind: 'trash',
      method: 'PATCH',
      url,
      body: { deletedAt: now.toISOString() },
      description: `Move this ${collectionSlug} document (#${String(id)}) to the trash? You can restore it later.`,
      confirmLabel: 'Move to trash',
      successTitle: 'Moved to trash',
    }
  }

  return {
    kind: 'permanent',
    method: 'DELETE',
    url,
    description: `Delete this ${collectionSlug} document (#${String(id)})? This cannot be undone.`,
    confirmLabel: 'Delete',
    successTitle: 'Document deleted',
  }
}

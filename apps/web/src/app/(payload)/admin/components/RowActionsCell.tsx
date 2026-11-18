'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@payloadcms/ui'
import { Pencil, Trash2 } from 'lucide-react'
import type { DefaultCellComponentProps } from 'payload'
import { rowDeletePlan } from '@/lib/row-actions.ts'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '../ui'

/**
 * Mock-parity `ACTIONS` cell — pencil (edit view) + trash (delete behind the
 * styled confirm Dialog, not a native window.confirm). Mounted on the injected
 * `_bmrActions` ui field by `applyListCellElevation`, so it works on
 * collections that never declare a real actions field. `useRouter` is safe
 * here because cells only render the interactive strip client-side.
 *
 * `trash` arrives as a client prop from the config-time transform (the client
 * config strips it) so a trash-enabled collection moves the row to the trash
 * instead of destroying it — see `lib/row-actions.ts` for why.
 */
export const RowActionsCell = ({
  collectionSlug,
  rowData,
  viewType,
  trash,
}: DefaultCellComponentProps & { trash?: boolean }): React.JSX.Element | null => {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const id = (rowData as Record<string, unknown> | undefined)?.id
  const plan = rowDeletePlan({ collectionSlug, id, trash, viewType })
  const inTrash = viewType === 'trash'
  const href = `/admin/collections/${collectionSlug}${inTrash ? '/trash' : ''}/${encodeURIComponent(String(id))}`

  const onDelete = async () => {
    if (busy || plan.kind === 'hidden') return
    setBusy(true)
    try {
      const res = await fetch(plan.url, {
        method: plan.method,
        credentials: 'same-origin',
        ...(plan.kind === 'trash'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan.body) }
          : {}),
      })
      if (!res.ok) {
        toast({
          title: plan.kind === 'trash' ? 'Trash Failed' : 'Delete Failed',
          description: `The server returned HTTP ${res.status}.`,
          variant: 'error',
        })
        return
      }
      toast({
        title: plan.successTitle,
        description: `${plan.kind === 'trash' ? 'Trashed' : 'Removed'} ${collectionSlug} #${String(id)}.`,
        variant: 'success',
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (plan.kind === 'hidden' && !inTrash) {
    return (
      <span className="bmr-row-actions">
        <Link href={href} prefetch={false} aria-label="Edit" className="bmr-row-actions__edit">
          <Pencil size={14} aria-hidden="true" />
          <span className="bmr-row-actions__label">Edit</span>
        </Link>
      </span>
    )
  }

  return (
    <span className="bmr-row-actions">
      <Link href={href} prefetch={false} aria-label="Edit" className="bmr-row-actions__edit">
        <Pencil size={14} aria-hidden="true" />
        <span className="bmr-row-actions__label">Edit</span>
      </Link>
      {plan.kind !== 'hidden' && (
        <button
          type="button"
          aria-label={plan.confirmLabel}
          className="bmr-row-actions__delete"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      )}
      {plan.kind !== 'hidden' && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{plan.kind === 'trash' ? 'Move to Trash' : 'Delete Document'}</DialogTitle>
              <DialogDescription>{plan.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setConfirmOpen(false)
                  void onDelete()
                }}
              >
                {busy ? `${plan.confirmLabel}…` : plan.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </span>
  )
}

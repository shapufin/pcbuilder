'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@payloadcms/ui'
import { Pencil, Trash2 } from 'lucide-react'
import type { DefaultCellComponentProps } from 'payload'
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
 * Mock-parity `ACTIONS` cell — pencil (edit view) + trash (REST delete behind
 * the styled confirm Dialog, not a native window.confirm). Mounted on the
 * injected `_bmrActions` ui field by `applyListCellElevation`, so it works on
 * collections that never declare a real actions field. `useRouter` is safe
 * here because cells only render the interactive strip client-side.
 */
export const RowActionsCell = ({
  collectionSlug,
  rowData,
}: DefaultCellComponentProps): React.JSX.Element => {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const id = (rowData as Record<string, unknown> | undefined)?.id
  const href = `/admin/collections/${collectionSlug}/${encodeURIComponent(String(id))}`

  const onDelete = async () => {
    if (busy || id == null) return
    setBusy(true)
    try {
      const res = await fetch(`/api/${collectionSlug}/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        toast({
          title: 'Delete Failed',
          description: `The server returned HTTP ${res.status}.`,
          variant: 'error',
        })
        return
      }
      toast({
        title: 'Document Deleted',
        description: `Removed ${collectionSlug} #${String(id)}.`,
        variant: 'success',
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="bmr-row-actions">
      <Link href={href} prefetch={false} aria-label="Edit" className="bmr-row-actions__edit">
        <Pencil size={14} aria-hidden="true" />
        <span className="bmr-row-actions__label">Edit</span>
      </Link>
      <button
        type="button"
        aria-label="Delete"
        className="bmr-row-actions__delete"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Delete this {collectionSlug} document (#{String(id)})? This cannot be undone.
            </DialogDescription>
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
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  )
}

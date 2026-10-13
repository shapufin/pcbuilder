'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  EmptyState,
  useToast,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui'

interface AttributeTerm {
  id: string | number
  value: string
  displayLabel?: string | null
}

export const AttributeTermsManager: React.FC = () => {
  const pathname = usePathname()
  // URL pattern: /admin/collections/attribute-types/:id
  const match = pathname?.match(/\/admin\/collections\/attribute-types\/([^/?#]+)/)
  const docId = match && match[1] !== 'create' ? match[1] : null

  const [terms, setTerms] = useState<AttributeTerm[]>([])
  const [loading, setLoading] = useState(true)
  // Terms belong to the doc they were fetched for — deriving `loaded` off the
  // marker avoids flashing "0 Terms" while the first query is in flight.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const loaded = loadedFor === docId
  const [saving, setSaving] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [pendingDelete, setPendingDelete] = useState<AttributeTerm | null>(null)
  const { toast } = useToast()

  const reloadTerms = useCallback(() => {
    if (!docId) return Promise.resolve()
    setLoading(true)
    return fetch(`/api/attribute-values?where[attributeType][equals]=${docId}&limit=100&depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setTerms(data?.docs || [])
        setLoadedFor(docId)
      })
      .catch((err) => {
        console.error('[AttributeTermsManager] Failed to fetch terms:', err)
        setLoadedFor(docId)
      })
      .finally(() => setLoading(false))
  }, [docId])

  useEffect(() => {
    if (!docId || loadedFor === docId) return

    let isMounted = true
    fetch(`/api/attribute-values?where[attributeType][equals]=${docId}&limit=100&depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isMounted) return
        setTerms(data?.docs || [])
        setLoadedFor(docId)
        setLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('[AttributeTermsManager] Failed to fetch terms:', err)
        setLoadedFor(docId)
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [docId, loadedFor])

  const handleAddTerm = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault()
    if (!docId || !newValue.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/attribute-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributeType: docId,
          value: newValue.trim(),
          displayLabel: newLabel.trim() || undefined,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Term Added',
          description: `Term "${newValue.trim()}" added successfully.`,
          variant: 'success',
        })
        setNewValue('')
        setNewLabel('')
        await reloadTerms()
      } else {
        const errData = await res.json().catch(() => ({}))
        toast({
          title: 'Error Adding Term',
          description: errData.errors?.[0]?.message || 'Failed to add term. Ensure value is unique.',
          variant: 'error',
        })
      }
    } catch {
      toast({
        title: 'Network Error',
        description: 'Failed to communicate with the server.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTerm = async (term: AttributeTerm) => {
    const termId = term.id
    const termValue = term.value

    try {
      const res = await fetch(`/api/attribute-values/${termId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast({
          title: 'Term Removed',
          description: `Removed "${termValue}".`,
          variant: 'info',
        })
        setTerms((prev) => prev.filter((t) => t.id !== termId))
      } else {
        toast({
          title: 'Delete Failed',
          description: 'Failed to delete term from server.',
          variant: 'error',
        })
      }
    } catch {
      toast({
        title: 'Network Error',
        description: 'Failed to communicate with the server.',
        variant: 'error',
      })
    }
  }

  if (!docId) {
    return (
      <EmptyState
        icon={<Tag size={20} />}
        title="Save Attribute Type First"
        description="Save this attribute type (name & slug) to manage its terms and allowed values in this screen."
      />
    )
  }

  return (
    <Card className="bmr-terms-manager">
      <CardHeader className="bmr-terms-manager__header">
        <div className="bmr-terms-manager__title-group">
          <Tag size={18} className="bmr-terms-manager__icon" />
          <CardTitle className="bmr-terms-manager__title">Configured Terms &amp; Values</CardTitle>
          <Badge variant="muted">
            {loaded ? `${terms.length} ${terms.length === 1 ? 'Term' : 'Terms'}` : '…'}
          </Badge>
        </div>

        {loading && <Loader2 size={16} className="bmr-spin bmr-terms-manager__icon" />}
      </CardHeader>

      <CardContent className="bmr-terms-manager__content">
        {/* Terms list */}
        {!loaded || loading ? (
          <div className="bmr-terms-loading" role="status">
            <Loader2 size={16} className="bmr-spin" /> Loading terms…
          </div>
        ) : terms.length === 0 ? (
          <EmptyState
            icon={<Tag size={18} />}
            title="No terms defined yet"
            description="Add the first term below (e.g. AM5, LGA1700, DDR5, ATX)."
          />
        ) : (
          <div className="bmr-terms-grid">
            {terms.map((term) => (
              <div key={term.id} className="bmr-term-card">
                <div className="bmr-term-card__info">
                  <span className="bmr-term-card__value">{term.value}</span>
                  {term.displayLabel && (
                    <span className="bmr-term-card__label">{term.displayLabel}</span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPendingDelete(term)}
                  title={`Remove term ${term.value}`}
                  aria-label={`Remove term ${term.value}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Term Form */}
        <div className="bmr-terms-form">
          <div className="bmr-terms-form__field">
            <Input
              label="Term Value *"
              placeholder="e.g. AM5, DDR5, ATX"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddTerm(e)
                }
              }}
              required
            />
          </div>

          <div className="bmr-terms-form__field">
            <Input
              label="Display Label (Optional)"
              placeholder="e.g. AMD Socket AM5"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddTerm(e)
                }
              }}
            />
          </div>

          <Button
            variant="primary"
            onClick={() => void handleAddTerm()}
            disabled={saving || !newValue.trim()}
            loading={saving}
          >
            <Plus size={14} />
            <span>Add Term</span>
          </Button>
        </div>
      </CardContent>

      {/* Styled delete confirmation (replaces native window.confirm) */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Term</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `Remove term "${pendingDelete.value}"? Products referencing it keep their stored value but lose the label mapping.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (pendingDelete) void handleDeleteTerm(pendingDelete)
                setPendingDelete(null)
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default AttributeTermsManager

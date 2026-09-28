'use client'

import React, { useEffect, useState } from 'react'

interface ConflictEntry {
  ruleId: string
  otherId: string
  otherName: string
  rule: { type: string; operator: string; field: string; value: unknown; severity: string; message: string }
  message: string
}

/**
 * Per-component live conflict table on the Component edit view
 * (see 04-collections/compatibility.md — admin UX).
 */
export const ConflictsField: React.FC<{ data?: { id?: string | number } }> = ({ data }) => {
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const componentId = data?.id

  useEffect(() => {
    if (!componentId || !open) return
    setLoading(true)
    fetch(`/api/builder/rules/conflicts?componentId=${componentId}`, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: { conflicts?: ConflictEntry[] }) => setConflicts(json.conflicts ?? []))
      .catch(() => setConflicts([]))
      .finally(() => setLoading(false))
  }, [componentId, open])

  if (!componentId) {
    return <p style={{ opacity: 0.6 }}>Save the component to see its conflicts.</p>
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <button type="button" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} live conflicts ({conflicts.length})
      </button>
      {open && (
        <div style={{ marginTop: '0.75rem' }}>
          {loading && <p style={{ opacity: 0.6 }}>Evaluating…</p>}
          {!loading && conflicts.length === 0 && <p style={{ opacity: 0.6 }}>No conflicts found.</p>}
          {!loading &&
            conflicts.map((c) => (
              <div
                key={`${c.ruleId}-${c.otherId}`}
                style={{
                  borderLeft: `3px solid ${c.rule.severity === 'error' ? '#b91c1c' : '#b45309'}`,
                  padding: '0.4rem 0.75rem',
                  marginBottom: '0.5rem',
                  background: 'var(--theme-elevation-50, #fafafa)',
                }}
              >
                <strong>{c.otherName}</strong>
                <span style={{ opacity: 0.7 }}> — {c.rule.type} / {c.rule.operator} {c.rule.field} = {String(c.rule.value)}</span>
                <div style={{ opacity: 0.8 }}>{c.message}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default ConflictsField

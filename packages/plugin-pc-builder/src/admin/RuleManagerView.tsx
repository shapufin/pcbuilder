'use client'

import React, { useCallback, useEffect, useState } from 'react'

interface RuleRecord {
  id: string | number
  subjectType: 'component' | 'category'
  subjectComponent?: { name?: string } | null
  subjectCategory?: { name?: string } | null
  targetType: 'component' | 'category'
  targetComponent?: { name?: string } | null
  targetCategory?: { name?: string } | null
  type: string
  operator: string
  field: string
  value: string
  severity: string
  bidirectional?: boolean
  message?: string
  enabled?: boolean
}

const CSV_HEADER =
  'subject,subjectType,type,operator,field,value,targetType,targetCategory,severity,message'

const toCsvRow = (r: RuleRecord): string =>
  [
    r.subjectType === 'component' ? r.subjectComponent?.name : r.subjectCategory?.name,
    r.subjectType,
    r.type,
    r.operator,
    r.field,
    r.value,
    r.targetType === 'component' ? r.targetComponent?.name : r.targetCategory?.name,
    r.targetType === 'component' ? '' : (r.targetCategory?.name ?? ''),
    r.severity,
    r.message ?? '',
  ]
    .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
    .join(',')

const label = (r: RuleRecord): string =>
  r.subjectType === 'component'
    ? (r.subjectComponent?.name ?? String(r.subjectComponent))
    : (r.subjectCategory?.name ?? String(r.subjectCategory))

const targetLabel = (r: RuleRecord): string =>
  r.targetType === 'component'
    ? (r.targetComponent?.name ?? String(r.targetComponent))
    : (r.targetCategory?.name ?? String(r.targetCategory))

const severityColor: Record<string, string> = {
  error: '#b91c1c',
  warning: '#b45309',
  info: '#1d4ed8',
}

/**
 * "Compatibility Rules" manager — spreadsheet-like grid with inline enable
 * toggles, delete, CSV export and CSV import (see 04-collections/compatibility.md).
 */
export const RuleManagerView: React.FC = () => {
  const [rules, setRules] = useState<RuleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/compatibility-rules?limit=1000&depth=1&sort=updatedAt', {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: { docs?: RuleRecord[] } = await res.json()
      setRules(json.docs ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleEnabled = async (r: RuleRecord) => {
    await fetch(`/api/compatibility-rules/${r.id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !r.enabled }),
    })
    void load()
  }

  const removeRule = async (r: RuleRecord) => {
    if (!window.confirm(`Delete rule "${label(r)} → ${targetLabel(r)}"?`)) return
    await fetch(`/api/compatibility-rules/${r.id}`, { method: 'DELETE', credentials: 'same-origin' })
    void load()
  }

  const exportCsv = () => {
    const csv = [CSV_HEADER, ...rules.map(toCsvRow)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compatibility-rules.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCsv = async (file: File) => {
    setImportStatus('Importing…')
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      const header = lines[0]?.toLowerCase() ?? ''
      const dataLines = header.includes('subject') ? lines.slice(1) : lines
      const rows = dataLines.map((line) => {
        const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '')) ?? []
        const clean = (i: number) => (cells[i] ?? '').replace(/^"|"$/g, '').replace(/""/g, '"')
        return {
          subject: clean(0),
          subjectType: clean(1) || 'category',
          type: clean(2),
          operator: clean(3),
          field: clean(4),
          value: clean(5),
          targetType: clean(6) || 'category',
          targetCategory: clean(7),
          severity: clean(8) || 'error',
          message: clean(9),
        }
      })
      const res = await fetch('/api/builder/rules/import', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const json: { created?: number; errors?: string[] } = await res.json()
      setImportStatus(`Created ${json.created ?? 0} rules${json.errors?.length ? `, ${json.errors.length} errors: ${json.errors.slice(0, 3).join('; ')}` : ''}`)
      void load()
    } catch (e) {
      setImportStatus(`Import failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const visible = rules.filter((r) =>
    filter ? `${label(r)} ${r.type} ${r.field} ${targetLabel(r)}`.toLowerCase().includes(filter.toLowerCase()) : true,
  )

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Compatibility Rules</h1>
      <p style={{ marginBottom: '1rem', opacity: 0.7 }}>
        {rules.length} rules · bidirectional rules are mirrored at evaluation time, not stored twice.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '0.4rem 0.6rem', borderRadius: 4, border: '1px solid var(--theme-elevation-200, #ccc)' }}
        />
        <button type="button" onClick={exportCsv}>Export CSV</button>
        <label style={{ cursor: 'pointer' }}>
          <span>Import CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importCsv(f)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" onClick={() => void load()}>Reload</button>
        {importStatus && <span style={{ opacity: 0.75 }}>{importStatus}</span>}
      </div>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--theme-elevation-150, #ddd)' }}>
              <th style={cellStyle}>Subject</th>
              <th style={cellStyle}>Type</th>
              <th style={cellStyle}>Condition</th>
              <th style={cellStyle}>Target</th>
              <th style={cellStyle}>Severity</th>
              <th style={cellStyle}>Enabled</th>
              <th style={cellStyle} />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--theme-elevation-100, #eee)' }}>
                <td style={cellStyle}>{label(r)}</td>
                <td style={cellStyle}>{r.type}</td>
                <td style={cellStyle}>
                  {r.operator} <code>{r.field}</code> = <code>{r.value}</code>
                </td>
                <td style={cellStyle}>{targetLabel(r)}</td>
                <td style={{ ...cellStyle, color: severityColor[r.severity] }}>{r.severity}</td>
                <td style={cellStyle}>
                  <input type="checkbox" checked={r.enabled !== false} onChange={() => void toggleEnabled(r)} />
                </td>
                <td style={cellStyle}>
                  <button type="button" onClick={() => void removeRule(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const cellStyle: React.CSSProperties = { padding: '0.4rem 0.6rem', verticalAlign: 'top' }

export default RuleManagerView

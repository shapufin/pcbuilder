'use client'

import React, { useCallback, useEffect, useState } from 'react'

interface RuleRecord {
  id: string | number
  subjectType: 'component' | 'category'
  subjectComponent?: { id?: string | number; name?: string } | string | number | null
  subjectCategory?: { id?: string | number; name?: string } | string | number | null
  targetType: 'component' | 'category'
  targetComponent?: { id?: string | number; name?: string } | string | number | null
  targetCategory?: { id?: string | number; name?: string } | string | number | null
  type: string
  operator: string
  field: string
  value: string
  severity: string
  bidirectional?: boolean
  message?: string
  enabled?: boolean
}

interface OptionItem {
  id: string | number
  name: string
}

interface DiffEntry {
  line: number
  action: 'create' | 'skip' | 'error'
  reason?: string
  subjectType: string
  targetType: string
  type: string
  operator: string
  field: string
  value: string
  severity: string
}

interface PendingImport {
  rows: Record<string, string>[]
  entries: DiffEntry[]
  summary: { create: number; skip: number; error: number }
  errors: string[]
}

interface RuleDraft {
  id: string | number | null
  subjectType: 'component' | 'category'
  subjectId: string | number | ''
  targetType: 'component' | 'category'
  targetId: string | number | ''
  type: string
  operator: string
  field: string
  value: string
  severity: string
  message: string
}

const CSV_HEADER =
  'subject,subjectType,type,operator,field,value,targetType,targetCategory,severity,message'

const RULE_TYPES = ['requires', 'excludes', 'supports', 'warns']
const OPERATORS = ['equals', 'in', 'gte', 'lte', 'contains']
const SEVERITIES = ['error', 'warning', 'info']

const toCsvRow = (r: RuleRecord): string =>
  [
    r.subjectType === 'component' ? nameOf(r.subjectComponent) : nameOf(r.subjectCategory),
    r.subjectType,
    r.type,
    r.operator,
    r.field,
    r.value,
    nameOf(r.targetComponent) ?? nameOf(r.targetCategory),
    r.targetType === 'component' ? '' : (nameOf(r.targetCategory) ?? ''),
    r.severity,
    r.message ?? '',
  ]
    .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
    .join(',')

const idOfRel = (v: RuleRecord['subjectComponent']): string | number => {
  if (v && typeof v === 'object' && 'id' in v && v.id != null) return v.id
  if (typeof v === 'string' || typeof v === 'number') return v
  return ''
}

function nameOf(v: RuleRecord['subjectComponent']): string | undefined {
  if (v && typeof v === 'object' && 'name' in v && v.name != null) return String(v.name)
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return undefined
}

const label = (r: RuleRecord): string =>
  (r.subjectType === 'component' ? nameOf(r.subjectComponent) : nameOf(r.subjectCategory)) ?? '(none)'

const targetLabel = (r: RuleRecord): string =>
  (r.targetType === 'component' ? nameOf(r.targetComponent) : nameOf(r.targetCategory)) ?? '(none)'

const severityColor: Record<string, string> = {
  error: '#b91c1c',
  warning: '#b45309',
  info: '#1d4ed8',
}

const actionColor: Record<string, string> = {
  create: '#15803d',
  skip: '#64748b',
  error: '#b91c1c',
}

const draftFromRecord = (r: RuleRecord): RuleDraft => ({
  id: r.id,
  subjectType: r.subjectType,
  subjectId: idOfRel(r.subjectType === 'component' ? r.subjectComponent : r.subjectCategory),
  targetType: r.targetType,
  targetId: idOfRel(r.targetType === 'component' ? r.targetComponent : r.targetCategory),
  type: r.type,
  operator: r.operator,
  field: r.field,
  value: r.value,
  severity: r.severity,
  message: r.message ?? '',
})

const newDraft = (): RuleDraft => ({
  id: null,
  subjectType: 'component',
  subjectId: '',
  targetType: 'category',
  targetId: '',
  type: 'requires',
  operator: 'equals',
  field: 'socket',
  value: 'AM5',
  severity: 'error',
  message: '',
})

const draftBody = (d: RuleDraft): Record<string, unknown> => ({
  subjectType: d.subjectType,
  subjectComponent: d.subjectType === 'component' && d.subjectId !== '' ? d.subjectId : null,
  subjectCategory: d.subjectType === 'category' && d.subjectId !== '' ? d.subjectId : null,
  targetType: d.targetType,
  targetComponent: d.targetType === 'component' && d.targetId !== '' ? d.targetId : null,
  targetCategory: d.targetType === 'category' && d.targetId !== '' ? d.targetId : null,
  type: d.type,
  operator: d.operator,
  field: d.field,
  value: d.value,
  severity: d.severity,
  message: d.message,
})

const jsonRequest = async (url: string, method: string, body?: unknown): Promise<Response> =>
  fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

/**
 * "Compatibility Rules" manager — grid with inline row editing (relationships,
 * condition, severity), add/duplicate, CSV export, and CSV import with a
 * server-computed preview diff before commit (04-collections/compatibility.md;
 * Phase 4 deltas from entry 10).
 */
export const RuleManagerView: React.FC = () => {
  const [rules, setRules] = useState<RuleRecord[]>([])
  const [components, setComponents] = useState<OptionItem[]>([])
  const [categories, setCategories] = useState<OptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState<RuleDraft | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)

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

  const loadOptions = useCallback(async () => {
    try {
      const [comps, cats] = await Promise.all([
        fetch('/api/components?limit=5000&depth=0&sort=name', { credentials: 'same-origin' }),
        fetch('/api/component-categories?limit=100&depth=0&sort=name', { credentials: 'same-origin' }),
      ])
      if (comps.ok) {
        const j: { docs?: OptionItem[] } = await comps.json()
        setComponents(j.docs ?? [])
      }
      if (cats.ok) {
        const j: { docs?: OptionItem[] } = await cats.json()
        setCategories(j.docs ?? [])
      }
    } catch {
      /* selects fall back to empty; grid still works */
    }
  }, [])

  useEffect(() => {
    void load()
    void loadOptions()
  }, [load, loadOptions])

  const patchRule = async (id: string | number, partial: Record<string, unknown>) => {
    const res = await jsonRequest(`/api/compatibility-rules/${id}`, 'PATCH', partial)
    if (!res.ok) setStatus(`Save failed (HTTP ${res.status})`)
    void load()
  }

  const toggleEnabled = async (r: RuleRecord) => {
    await patchRule(r.id, { enabled: !(r.enabled !== false) })
  }

  const removeRule = async (r: RuleRecord) => {
    if (!window.confirm(`Delete rule "${label(r)} → ${targetLabel(r)}"?`)) return
    await fetch(`/api/compatibility-rules/${r.id}`, { method: 'DELETE', credentials: 'same-origin' })
    void load()
  }

  const duplicateRule = async (r: RuleRecord) => {
    const body = draftBody(draftFromRecord(r))
    body.enabled = r.enabled !== false
    const res = await jsonRequest('/api/compatibility-rules', 'POST', body)
    setStatus(res.ok ? `Duplicated "${label(r)}"` : `Duplicate failed (HTTP ${res.status})`)
    void load()
  }

  const saveDraft = async () => {
    if (!draft) return
    if (draft.subjectId === '' || draft.targetId === '') {
      setStatus('Subject and target are required')
      return
    }
    const body = draftBody(draft)
    const res =
      draft.id == null
        ? await jsonRequest('/api/compatibility-rules', 'POST', { ...body, enabled: true })
        : await jsonRequest(`/api/compatibility-rules/${draft.id}`, 'PATCH', body)
    if (!res.ok) {
      setStatus(`Save failed (HTTP ${res.status})`)
      return
    }
    setStatus(draft.id == null ? 'Rule created' : 'Rule saved')
    setDraft(null)
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

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    const header = lines[0]?.toLowerCase() ?? ''
    const dataLines = header.includes('subject') ? lines.slice(1) : lines
    return dataLines.map((line) => {
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
  }

  const previewImport = async (file: File) => {
    setStatus('Computing preview…')
    try {
      const rows = parseCsv(await file.text())
      const res = await jsonRequest('/api/builder/rules/import', 'POST', { rows, dryRun: true })
      const json: {
        entries?: DiffEntry[]
        summary?: { create: number; skip: number; error: number }
        errors?: string[]
      } = await res.json()
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPendingImport({
        rows,
        entries: json.entries ?? [],
        summary: json.summary ?? { create: 0, skip: 0, error: 0 },
        errors: json.errors ?? [],
      })
      setStatus(null)
    } catch (e) {
      setStatus(`Preview failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const commitImport = async () => {
    if (!pendingImport) return
    setStatus('Importing…')
    try {
      const res = await jsonRequest('/api/builder/rules/import', 'POST', { rows: pendingImport.rows })
      const json: { created?: number; skipped?: number; errors?: string[] } = await res.json()
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus(
        `Imported ${json.created ?? 0} rules, skipped ${json.skipped ?? 0} duplicates` +
          (json.errors?.length ? `, ${json.errors.length} errors` : ''),
      )
      setPendingImport(null)
      void load()
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const visible = rules.filter((r) =>
    filter
      ? `${label(r)} ${r.type} ${r.field} ${targetLabel(r)}`.toLowerCase().includes(filter.toLowerCase())
      : true,
  )

  const options = (kind: 'component' | 'category'): OptionItem[] =>
    kind === 'component' ? components : categories

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Compatibility Rules</h1>
      <p style={{ marginBottom: '1rem', opacity: 0.7 }}>
        {rules.length} rules · bidirectional rules are mirrored at evaluation time, not stored twice.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '0.4rem 0.6rem', borderRadius: 4, border: '1px solid var(--theme-elevation-200, #ccc)' }}
        />
        <button
          type="button"
          onClick={() => setDraft(newDraft())}
        >
          Add rule
        </button>
        <button type="button" onClick={exportCsv}>Export CSV</button>
        <label style={{ cursor: 'pointer' }}>
          <span>Import CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void previewImport(f)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" onClick={() => void load()}>Reload</button>
        {status && <span style={{ opacity: 0.75 }}>{status}</span>}
      </div>

      {pendingImport && (
        <div
          style={{
            border: '1px solid var(--theme-elevation-200, #ccc)',
            borderRadius: 6,
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Import preview</h3>
          <p style={{ opacity: 0.8 }}>
            {pendingImport.summary.create} to create · {pendingImport.summary.skip} identical (skipped) ·{' '}
            {pendingImport.summary.error} errors
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--theme-elevation-150, #ddd)' }}>
                <th style={cellStyle}>Line</th>
                <th style={cellStyle}>Action</th>
                <th style={cellStyle}>Condition</th>
                <th style={cellStyle}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {pendingImport.entries.map((e) => (
                <tr key={e.line} style={{ borderBottom: '1px solid var(--theme-elevation-100, #eee)' }}>
                  <td style={cellStyle}>{e.line}</td>
                  <td style={{ ...cellStyle, color: actionColor[e.action], fontWeight: 700 }}>{e.action}</td>
                  <td style={cellStyle}>
                    {e.action === 'error'
                      ? '—'
                      : `${e.subjectType} ${e.type} ${e.operator} ${e.field} = ${e.value} → ${e.targetType} (${e.severity})`}
                  </td>
                  <td style={cellStyle}>{e.reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => void commitImport()}
              disabled={pendingImport.summary.create === 0}
            >
              Import {pendingImport.summary.create} rules
            </button>
            <button type="button" onClick={() => setPendingImport(null)}>Cancel</button>
          </div>
        </div>
      )}

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
            {draft && draft.id == null && (
              <tr style={{ borderBottom: '1px solid #1d4ed8', background: 'rgba(29,78,216,0.06)' }}>
                <td colSpan={7} style={cellStyle}>
                  <DraftRow draft={draft} setDraft={setDraft} options={options} />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="button" onClick={() => void saveDraft()}>Create rule</button>
                    <button type="button" onClick={() => setDraft(null)}>Cancel</button>
                  </div>
                </td>
              </tr>
            )}
            {visible.map((r) =>
              draft && String(draft.id) === String(r.id) ? (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--theme-elevation-100, #eee)', background: 'rgba(29,78,216,0.06)' }}>
                  <td colSpan={7} style={cellStyle}>
                    <DraftRow draft={draft} setDraft={setDraft} options={options} />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="button" onClick={() => void saveDraft()}>Save</button>
                      <button type="button" onClick={() => setDraft(null)}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--theme-elevation-100, #eee)' }}>
                  <td style={cellStyle}>{label(r)}</td>
                  <td style={cellStyle}>{r.type}</td>
                  <td style={cellStyle}>
                    {r.operator} <code>{r.field}</code> = <code>{r.value}</code>
                  </td>
                  <td style={cellStyle}>{targetLabel(r)}</td>
                  <td style={{ ...cellStyle, color: severityColor[r.severity] }}>{r.severity}</td>
                  <td style={cellStyle}>
                    <input
                      type="checkbox"
                      checked={r.enabled !== false}
                      onChange={() => void toggleEnabled(r)}
                    />
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => setDraft(draftFromRecord(r))}>Edit</button>{' '}
                    <button type="button" onClick={() => void duplicateRule(r)}>Duplicate</button>{' '}
                    <button type="button" onClick={() => void removeRule(r)}>Delete</button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

const DraftRow: React.FC<{
  draft: RuleDraft
  setDraft: (d: RuleDraft) => void
  options: (kind: 'component' | 'category') => OptionItem[]
}> = ({ draft, setDraft, options }) => {
  const set = <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) =>
    setDraft({ ...draft, [key]: value })
  const subjectOptions = options(draft.subjectType)
  const targetOptions = options(draft.targetType)
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <select
        value={draft.subjectType}
        onChange={(e) =>
          setDraft({ ...draft, subjectType: e.target.value as RuleDraft['subjectType'], subjectId: '' })
        }
        style={inputStyle}
      >
        <option value="component">component</option>
        <option value="category">category</option>
      </select>
      <select
        value={String(draft.subjectId)}
        onChange={(e) => set('subjectId', e.target.value)}
        style={inputStyle}
      >
        <option value="">— subject —</option>
        {subjectOptions.map((o) => (
          <option key={String(o.id)} value={String(o.id)}>{o.name}</option>
        ))}
      </select>
      <select value={draft.type} onChange={(e) => set('type', e.target.value)} style={inputStyle}>
        {RULE_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select value={draft.operator} onChange={(e) => set('operator', e.target.value)} style={inputStyle}>
        {OPERATORS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <input
        type="text"
        value={draft.field}
        onChange={(e) => set('field', e.target.value)}
        placeholder="field"
        style={inputStyle}
      />
      <input
        type="text"
        value={draft.value}
        onChange={(e) => set('value', e.target.value)}
        placeholder="value"
        style={inputStyle}
      />
      <span>→</span>
      <select
        value={draft.targetType}
        onChange={(e) =>
          setDraft({ ...draft, targetType: e.target.value as RuleDraft['targetType'], targetId: '' })
        }
        style={inputStyle}
      >
        <option value="component">component</option>
        <option value="category">category</option>
      </select>
      <select
        value={String(draft.targetId)}
        onChange={(e) => set('targetId', e.target.value)}
        style={inputStyle}
      >
        <option value="">— target —</option>
        {targetOptions.map((o) => (
          <option key={String(o.id)} value={String(o.id)}>{o.name}</option>
        ))}
      </select>
      <select value={draft.severity} onChange={(e) => set('severity', e.target.value)} style={inputStyle}>
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        type="text"
        value={draft.message}
        onChange={(e) => set('message', e.target.value)}
        placeholder="message (optional)"
        style={{ ...inputStyle, minWidth: 220 }}
      />
    </div>
  )
}

const cellStyle: React.CSSProperties = { padding: '0.4rem 0.6rem', verticalAlign: 'top' }
const inputStyle: React.CSSProperties = {
  padding: '0.3rem 0.45rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-200, #ccc)',
  fontSize: '0.85rem',
}

export default RuleManagerView

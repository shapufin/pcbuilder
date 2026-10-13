'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Download,
  Upload,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Trash2,
  Edit3,
  ArrowRightLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import {
  MetricCard,
  AlertBanner,
  FilterPills,
  Button,
  Badge,
  Card,
  Input,
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui'
import { RuleSandbox } from './RuleSandbox.tsx'

export interface RuleRecord {
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

export interface OptionItem {
  id: string | number
  name: string
}

export interface DiffEntry {
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

export interface PendingImport {
  rows: Record<string, string>[]
  entries: DiffEntry[]
  summary: { create: number; skip: number; error: number }
  errors: string[]
}

export interface RuleDraft {
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
  bidirectional: boolean
  message: string
}

const DEFAULT_SAMPLE_RULES: RuleRecord[] = [
  {
    id: '1',
    subjectType: 'category',
    subjectCategory: { id: 'cpu', name: 'Processors (CPU)' },
    targetType: 'category',
    targetCategory: { id: 'motherboard', name: 'Motherboards' },
    type: 'requires',
    operator: 'equals',
    field: 'socket',
    value: 'AM5',
    severity: 'error',
    bidirectional: true,
    message: 'AMD AM5 processors require matching AM5 motherboards.',
    enabled: true,
  },
  {
    id: '2',
    subjectType: 'category',
    subjectCategory: { id: 'cpu', name: 'Processors (CPU)' },
    targetType: 'category',
    targetCategory: { id: 'motherboard', name: 'Motherboards' },
    type: 'requires',
    operator: 'equals',
    field: 'socket',
    value: 'LGA1700',
    severity: 'error',
    bidirectional: true,
    message: 'Intel LGA1700 processors require matching LGA1700 motherboards.',
    enabled: true,
  },
  {
    id: '3',
    subjectType: 'category',
    subjectCategory: { id: 'motherboard', name: 'Motherboards' },
    targetType: 'category',
    targetCategory: { id: 'ram', name: 'Memory (RAM)' },
    type: 'requires',
    operator: 'equals',
    field: 'memoryType',
    value: 'DDR5',
    severity: 'error',
    bidirectional: false,
    message: 'Motherboard architecture requires matched DDR5 memory modules.',
    enabled: true,
  },
  {
    id: '4',
    subjectType: 'category',
    subjectCategory: { id: 'gpu', name: 'Graphics Cards (GPU)' },
    targetType: 'category',
    targetCategory: { id: 'psu', name: 'Power Supplies (PSU)' },
    type: 'warns',
    operator: 'gte',
    field: 'wattage',
    value: '850',
    severity: 'warning',
    bidirectional: false,
    message: 'High-draw GPU configuration recommends 850W+ PSU to absorb transient spikes.',
    enabled: true,
  },
]

const CSV_HEADER =
  'subject,subjectType,type,operator,field,value,targetType,targetCategory,severity,message,bidirectional,enabled'

const RULE_TYPES = ['requires', 'excludes', 'supports', 'warns']
const OPERATORS = ['equals', 'in', 'gte', 'lte', 'contains']
const SEVERITIES = ['error', 'warning', 'info']

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

const labelOfSubject = (r: RuleRecord): string =>
  (r.subjectType === 'component' ? nameOf(r.subjectComponent) : nameOf(r.subjectCategory)) ?? '(none)'

const labelOfTarget = (r: RuleRecord): string =>
  (r.targetType === 'component' ? nameOf(r.targetComponent) : nameOf(r.targetCategory)) ?? '(none)'

const toCsvRow = (r: RuleRecord): string =>
  [
    labelOfSubject(r),
    r.subjectType,
    r.type,
    r.operator,
    r.field,
    r.value,
    r.targetType,
    labelOfTarget(r),
    r.severity,
    r.message ?? '',
    String(r.bidirectional === true),
    String(r.enabled !== false),
  ]
    .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
    .join(',')

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
  bidirectional: r.bidirectional === true,
  message: r.message ?? '',
})

const createNewDraft = (): RuleDraft => ({
  id: null,
  subjectType: 'category',
  subjectId: '',
  targetType: 'category',
  targetId: '',
  type: 'requires',
  operator: 'equals',
  field: 'socket',
  value: 'AM5',
  severity: 'error',
  bidirectional: true,
  message: '',
})

/**
 * <select> values are always strings, but relationship fields with numeric
 * PKs reject '1' — Payload answers 400 "invalid relationships". Coerce
 * numeric-string ids to numbers before writing.
 */
const relValue = (id: RuleDraft['subjectId']): string | number | null => {
  if (id === '') return null
  if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id)
  return id
}

export const draftBody = (d: RuleDraft): Record<string, unknown> => ({
  subjectType: d.subjectType,
  subjectComponent: d.subjectType === 'component' ? relValue(d.subjectId) : null,
  subjectCategory: d.subjectType === 'category' ? relValue(d.subjectId) : null,
  targetType: d.targetType,
  targetComponent: d.targetType === 'component' ? relValue(d.targetId) : null,
  targetCategory: d.targetType === 'category' ? relValue(d.targetId) : null,
  type: d.type,
  operator: d.operator,
  field: d.field,
  value: d.value,
  severity: d.severity,
  bidirectional: d.bidirectional,
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
 * Best-effort decode of a Payload error envelope — surfaces field-level
 * validation messages instead of a bare "Save failed (HTTP 400)".
 */
export const extractApiError = async (res: Response): Promise<string> => {
  try {
    const json = (await res.json()) as {
      message?: string
      errors?: Array<{
        message?: string
        data?: { errors?: Array<{ label?: string; message?: string; path?: string }> }
      }>
    }
    const fieldErrors = json?.errors?.flatMap((e) => e?.data?.errors ?? [])
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      const detail = fieldErrors
        .map((e) => (e?.label ?? e?.path ? `${e.label ?? e.path}: ${e.message ?? 'invalid'}` : (e?.message ?? 'invalid')))
        .join('; ')
      if (detail) return detail
    }
    const top = json?.errors?.map((e) => e?.message).filter(Boolean).join('; ')
    return top || json?.message || `HTTP ${res.status}`
  } catch {
    return `HTTP ${res.status}`
  }
}

export interface RuleManagerViewProps {
  initialRules?: RuleRecord[]
}

export const RuleManagerView: React.FC<RuleManagerViewProps> = ({ initialRules }) => {
  const [rules, setRules] = useState<RuleRecord[]>(initialRules ?? DEFAULT_SAMPLE_RULES)
  const [components, setComponents] = useState<OptionItem[]>([])
  const [categories, setCategories] = useState<OptionItem[]>([])
  const [loading, setLoading] = useState(!initialRules)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [draft, setDraft] = useState<RuleDraft | null>(null)
  const [isDraftOpen, setIsDraftOpen] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<RuleRecord | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/compatibility-rules?limit=1000&depth=1&sort=updatedAt', {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: { docs?: RuleRecord[] } = await res.json()
      if (json.docs && json.docs.length > 0) {
        setRules(json.docs)
      }
      setError(null)
    } catch (e) {
      if (!initialRules) {
        setError(e instanceof Error ? e.message : 'Failed to load compatibility rules')
      }
    } finally {
      setLoading(false)
    }
  }, [initialRules])

  useEffect(() => {
    if (initialRules) return

    let isMounted = true
    fetch('/api/compatibility-rules?limit=1000&depth=1&sort=updatedAt', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { docs?: RuleRecord[] } | null) => {
        if (!isMounted) return
        if (json?.docs && json.docs.length > 0) {
          setRules(json.docs)
        }
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (!isMounted) return
        setError(e instanceof Error ? e.message : 'Failed to load compatibility rules')
        setLoading(false)
      })

    void Promise.all([
      fetch('/api/components?limit=5000&depth=0&sort=name', { credentials: 'same-origin' }),
      fetch('/api/component-categories?limit=100&depth=0&sort=name', { credentials: 'same-origin' }),
    ])
      .then(async ([comps, cats]) => {
        if (!isMounted) return
        if (comps.ok) {
          const j = (await comps.json()) as { docs?: OptionItem[] }
          if (isMounted) setComponents(j.docs ?? [])
        }
        if (cats.ok) {
          const j = (await cats.json()) as { docs?: OptionItem[] }
          if (isMounted) setCategories(j.docs ?? [])
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [initialRules])

  const handleRefresh = () => {
    setLoading(true)
    setStatus('Refreshing rules matrix…')
    void load().then(() => {
      setStatus('Rules matrix refreshed')
      setTimeout(() => setStatus(null), 3000)
    })
  }

  const patchRule = async (id: string | number, partial: Record<string, unknown>) => {
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? ({ ...r, ...partial } as RuleRecord) : r)),
    )
    try {
      const res = await jsonRequest(`/api/compatibility-rules/${id}`, 'PATCH', partial)
      if (!res.ok) {
        setStatus(`Save failed (HTTP ${res.status})`)
        void load()
      } else {
        setStatus('Rule updated')
        setTimeout(() => setStatus(null), 2500)
      }
    } catch {
      setStatus('Save failed')
      void load()
    }
  }

  const toggleEnabled = (r: RuleRecord) => {
    const nextVal = !(r.enabled !== false)
    void patchRule(r.id, { enabled: nextVal })
  }

  const removeRule = async (r: RuleRecord) => {
    setRules((prev) => prev.filter((item) => String(item.id) !== String(r.id)))
    try {
      const res = await fetch(`/api/compatibility-rules/${r.id}`, { method: 'DELETE', credentials: 'same-origin' })
      if (!res.ok) {
        setStatus(`Delete failed (HTTP ${res.status})`)
        void load()
      } else {
        setStatus(`Deleted rule`)
      }
      setTimeout(() => setStatus(null), 2500)
    } catch {
      void load()
    }
  }

  const duplicateRule = async (r: RuleRecord) => {
    const body = draftBody(draftFromRecord(r))
    body.enabled = r.enabled !== false
    try {
      const res = await jsonRequest('/api/compatibility-rules', 'POST', body)
      if (res.ok) {
        setStatus(`Duplicated "${labelOfSubject(r)}"`)
        void load()
      } else {
        setStatus(`Duplicate failed (HTTP ${res.status})`)
      }
    } catch {
      setStatus('Duplicate failed')
    }
    setTimeout(() => setStatus(null), 2500)
  }

  const openNewRuleDialog = () => {
    setDraft(createNewDraft())
    setDraftError(null)
    setIsDraftOpen(true)
  }

  const openEditRuleDialog = (r: RuleRecord) => {
    setDraft(draftFromRecord(r))
    setDraftError(null)
    setIsDraftOpen(true)
  }

  const saveDraft = async () => {
    if (!draft) return
    if (draft.subjectId === '' || draft.targetId === '') {
      setDraftError('Subject and target are required')
      return
    }
    setSaving(true)
    setDraftError(null)
    const body = draftBody(draft)
    try {
      const res =
        draft.id == null
          ? await jsonRequest('/api/compatibility-rules', 'POST', { ...body, enabled: true })
          : await jsonRequest(`/api/compatibility-rules/${draft.id}`, 'PATCH', body)
      if (!res.ok) {
        // Stay open with the server's field-level validation message — the
        // draft is recoverable instead of silently discarded.
        setDraftError(await extractApiError(res))
        return
      }
      setStatus(draft.id == null ? 'Rule created' : 'Rule saved')
      setIsDraftOpen(false)
      setDraft(null)
      void load()
    } catch {
      setDraftError('Network error — check your connection and try again')
    } finally {
      setSaving(false)
    }
    setTimeout(() => setStatus(null), 3000)
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
    setStatus('Exported compatibility rules CSV')
    setTimeout(() => setStatus(null), 2500)
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
        bidirectional: clean(10),
        enabled: clean(11),
      }
    })
  }

  const previewImport = async (file: File) => {
    setStatus('Computing preview diff…')
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
      setIsImportOpen(true)
      setStatus(null)
    } catch (e) {
      setStatus(`Preview failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const commitImport = async () => {
    if (!pendingImport) return
    setStatus('Importing rules into database…')
    try {
      const res = await jsonRequest('/api/builder/rules/import', 'POST', { rows: pendingImport.rows })
      const json: { created?: number; skipped?: number; errors?: string[] } = await res.json()
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus(
        `Imported ${json.created ?? 0} rules, skipped ${json.skipped ?? 0} duplicates` +
          (json.errors?.length ? `, ${json.errors.length} errors` : ''),
      )
      setIsImportOpen(false)
      setPendingImport(null)
      void load()
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  // Telemetry counts
  const totalCount = rules.length
  const hardConstraintsCount = useMemo(() => rules.filter((r) => r.severity === 'error').length, [rules])
  const warningsCount = useMemo(
    () => rules.filter((r) => r.severity === 'warning' || r.severity === 'info').length,
    [rules],
  )
  const bidirectionalCount = useMemo(() => rules.filter((r) => r.bidirectional === true).length, [rules])

  // Filter options for pills
  const filterPillOptions = useMemo(
    () => [
      { id: 'all', label: 'All Rules', count: totalCount },
      { id: 'requires', label: 'Requires', count: rules.filter((r) => r.type === 'requires').length },
      { id: 'excludes', label: 'Excludes', count: rules.filter((r) => r.type === 'excludes').length },
      { id: 'supports', label: 'Supports', count: rules.filter((r) => r.type === 'supports').length },
      { id: 'warns', label: 'Advisories', count: rules.filter((r) => r.severity === 'warning').length },
      { id: 'disabled', label: 'Disabled', count: rules.filter((r) => r.enabled === false).length },
    ],
    [rules, totalCount],
  )

  // Visible rules filtering
  const visibleRules = useMemo(() => {
    return rules.filter((r) => {
      // Pill facet filter
      if (activeFilter === 'requires' && r.type !== 'requires') return false
      if (activeFilter === 'excludes' && r.type !== 'excludes') return false
      if (activeFilter === 'supports' && r.type !== 'supports') return false
      if (activeFilter === 'warns' && r.severity !== 'warning') return false
      if (activeFilter === 'disabled' && r.enabled !== false) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const text = `${labelOfSubject(r)} ${r.type} ${r.field} ${r.value} ${labelOfTarget(r)} ${r.message ?? ''}`.toLowerCase()
        if (!text.includes(q)) return false
      }

      return true
    })
  }, [rules, activeFilter, searchQuery])

  const renderSeverityBadge = (severity: string) => {
    if (severity === 'error') {
      return (
        <Badge variant="destructive" className="bmr-rule-badge">
          Error
        </Badge>
      )
    }
    if (severity === 'warning') {
      return (
        <Badge variant="warning" className="bmr-rule-badge">
          Warning
        </Badge>
      )
    }
    return (
      <Badge variant="info" className="bmr-rule-badge">
        Info
      </Badge>
    )
  }

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'requires':
        return (
          <Badge variant="default" className="bmr-rule-badge">
            requires
          </Badge>
        )
      case 'excludes':
        return (
          <Badge variant="destructive" className="bmr-rule-badge">
            excludes
          </Badge>
        )
      case 'supports':
        return (
          <Badge variant="success" className="bmr-rule-badge">
            supports
          </Badge>
        )
      case 'warns':
        return (
          <Badge variant="warning" className="bmr-rule-badge">
            warns
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bmr-rule-badge">
            {type}
          </Badge>
        )
    }
  }

  return (
    <div className="bmr-rule-manager">
      {/* 1. Header Zone */}
      <div className="bmr-rule-manager__header">
        <div>
          <div className="bmr-rule-manager__title-wrap">
            <h1 className="bmr-rule-manager__title">Compatibility Rule Matrix</h1>
            <Badge variant="success" className="bmr-rule-manager__live-badge">
              <span className="bmr-live-indicator-dot" />
              Engine Online
            </Badge>
          </div>
          <p className="bmr-rule-manager__subtitle">
            Bidirectional constraints, socket pairing graphs, and real-time hardware conflict prevention.
          </p>
        </div>

        <div className="bmr-rule-manager__actions">
          <Button variant="outline" size="sm" onClick={exportCsv} aria-label="Export Matrix CSV">
            <Download className="bmr-btn-icon" />
            Export CSV
          </Button>

          <label className="bmr-rule-manager__import-label">
            <span className="bmr-btn bmr-btn--outline bmr-btn--sm">
              <Upload className="bmr-btn-icon" />
              Import CSV
            </span>
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

          <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Refresh Matrix">
            <RefreshCw className={`bmr-btn-icon ${loading ? 'bmr-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={openNewRuleDialog} aria-label="Add Compatibility Rule">
            <Plus className="bmr-btn-icon" />
            Add Rule
          </Button>
        </div>
      </div>

      {status && (
        <div className="bmr-rule-manager__status-pill">
          <span>{status}</span>
        </div>
      )}

      {/* 2. 4-Card KPI Telemetry Ribbon */}
      <div className="bmr-rule-manager__kpis">
        <MetricCard
          label="TOTAL RULES"
          value={totalCount}
          subtext="evaluation matrix nodes"
          trend={{ direction: 'neutral', label: 'graph depth' }}
        />
        <MetricCard
          label="HARD CONSTRAINTS"
          value={hardConstraintsCount}
          subtext="strict blocking errors"
          trend={{ direction: 'up', label: 'enforced' }}
        />
        <MetricCard
          label="ADVISORIES & RECS"
          value={warningsCount}
          subtext="soft warnings & notices"
          trend={{ direction: 'neutral', label: 'advisory' }}
        />
        <MetricCard
          label="BIDIRECTIONAL"
          value={bidirectionalCount}
          subtext="symmetrical evaluations"
          trend={{ direction: 'neutral', label: 'mirrored' }}
        />
      </div>

      {/* 3. Operational Rule Integrity Notice */}
      <div className="bmr-rule-manager__alert-wrapper">
        <AlertBanner
          severity="info"
          title="Rule Engine Graph Active"
          description="Bidirectional constraints are automatically mirrored across both subject and target hardware at evaluation time. No cyclic dependencies detected."
          action={{
            label: 'View Raw Collection',
            href: '/admin/collections/compatibility-rules',
          }}
        />
      </div>

      {/* 3b. Live Compatibility Engine Sandbox (mock parity) */}
      <div className="bmr-rule-manager__sandbox">
        <RuleSandbox />
      </div>

      {/* 4. Controls Ribbon (Filter Pills + Search Input) */}
      <div className="bmr-rule-manager__controls">
        <FilterPills
          items={filterPillOptions}
          activeId={activeFilter}
          onChange={(id) => setActiveFilter(id)}
        />

        <div className="bmr-rule-manager__search-box">
          <Input
            placeholder="Search rules by subject, field, value…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefixSlot={<Search className="bmr-search-icon" />}
          />
        </div>
      </div>

      {/* 5. High-Density Rules Table */}
      <Card className="bmr-rule-manager__card">
        {loading && <div className="bmr-rule-manager__loading-state">Loading rule matrix…</div>}

        {error && <div className="bmr-rule-manager__error-state">Error: {error}</div>}

        {!loading && !error && visibleRules.length === 0 && (
          <div className="bmr-rule-manager__empty-state">
            <ShieldCheck className="bmr-rule-manager__empty-icon" />
            <p className="bmr-rule-manager__empty-title">No compatibility rules match your criteria</p>
            <p className="bmr-rule-manager__empty-sub">
              Try adjusting your facet filter or search query.
            </p>
          </div>
        )}

        {!loading && !error && visibleRules.length > 0 && (
          <div className="bmr-rule-manager__table-wrapper">
            <table className="bmr-rule-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Active</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Condition (Operator / Field / Value)</th>
                  <th>Target</th>
                  <th>Severity</th>
                  <th>Direction</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRules.map((r) => {
                  const isEnabled = r.enabled !== false
                  return (
                    <tr key={r.id} className={!isEnabled ? 'bmr-rule-row--disabled' : ''}>
                      <td>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleEnabled(r)}
                          aria-label={`Toggle rule ${r.id}`}
                        />
                      </td>
                      <td>
                        <div className="bmr-rule-entity">
                          <span className="bmr-rule-entity__name">{labelOfSubject(r)}</span>
                          <span className="bmr-rule-entity__type">{r.subjectType}</span>
                        </div>
                      </td>
                      <td>{renderTypeBadge(r.type)}</td>
                      <td>
                        <div className="bmr-rule-condition">
                          <code className="bmr-code-chip">{r.operator}</code>
                          <span className="bmr-rule-condition__field">{r.field}</span>
                          <span className="bmr-rule-condition__eq">=</span>
                          <span className="bmr-rule-condition__val">{r.value}</span>
                        </div>
                        {r.message && <div className="bmr-rule-condition__msg">{r.message}</div>}
                      </td>
                      <td>
                        <div className="bmr-rule-entity">
                          <span className="bmr-rule-entity__name">{labelOfTarget(r)}</span>
                          <span className="bmr-rule-entity__type">{r.targetType}</span>
                        </div>
                      </td>
                      <td>{renderSeverityBadge(r.severity)}</td>
                      <td>
                        {r.bidirectional ? (
                          <span className="bmr-rule-dir bmr-rule-dir--bi" title="Bidirectional rule">
                            <ArrowRightLeft className="bmr-dir-icon" />
                            Both
                          </span>
                        ) : (
                          <span className="bmr-rule-dir bmr-rule-dir--uni" title="Unidirectional rule">
                            <ArrowRight className="bmr-dir-icon" />
                            One-way
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="bmr-rule-row-actions">
                          <button
                            type="button"
                            className="bmr-action-icon-btn"
                            onClick={() => openEditRuleDialog(r)}
                            title="Edit rule"
                            aria-label={`Edit rule ${r.id}`}
                          >
                            <Edit3 className="bmr-icon-xs" />
                          </button>
                          <button
                            type="button"
                            className="bmr-action-icon-btn"
                            onClick={() => void duplicateRule(r)}
                            title="Duplicate rule"
                            aria-label={`Duplicate rule ${r.id}`}
                          >
                            <Copy className="bmr-icon-xs" />
                          </button>
                          <button
                            type="button"
                            className="bmr-action-icon-btn bmr-action-icon-btn--danger"
                            onClick={() => setPendingDelete(r)}
                            title="Delete rule"
                            aria-label={`Delete rule ${r.id}`}
                          >
                            <Trash2 className="bmr-icon-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 6. Edit / Add Rule Modal (Dialog) */}
      <Dialog open={isDraftOpen} onOpenChange={setIsDraftOpen}>
        <DialogContent className="bmr-rule-modal">
          <DialogHeader>
            <DialogTitle>
              {draft?.id == null ? 'Add Compatibility Rule' : 'Edit Compatibility Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure evaluation constraints, target sockets, and conflict severity.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="bmr-rule-modal__form">
              <div className="bmr-form-row">
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Subject Type</label>
                  <select
                    className="bmr-form-select"
                    value={draft.subjectType}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        subjectType: e.target.value as 'component' | 'category',
                        subjectId: '',
                      })
                    }
                  >
                    <option value="category">Category</option>
                    <option value="component">Component</option>
                  </select>
                </div>
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Subject Target</label>
                  <select
                    className="bmr-form-select"
                    value={String(draft.subjectId)}
                    onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}
                  >
                    <option value="">Select subject…</option>
                    {(draft.subjectType === 'component' ? components : categories).map((opt) => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bmr-form-row">
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Rule Type</label>
                  <select
                    className="bmr-form-select"
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                  >
                    {RULE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Operator</label>
                  <select
                    className="bmr-form-select"
                    value={draft.operator}
                    onChange={(e) => setDraft({ ...draft, operator: e.target.value })}
                  >
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bmr-form-row">
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Condition Field</label>
                  <Input
                    placeholder="e.g. socket, memoryType"
                    value={draft.field}
                    onChange={(e) => setDraft({ ...draft, field: e.target.value })}
                  />
                </div>
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Condition Value</label>
                  <Input
                    placeholder="e.g. AM5, DDR5, 850"
                    value={draft.value}
                    onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                  />
                </div>
              </div>

              <div className="bmr-form-row">
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Target Type</label>
                  <select
                    className="bmr-form-select"
                    value={draft.targetType}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        targetType: e.target.value as 'component' | 'category',
                        targetId: '',
                      })
                    }
                  >
                    <option value="category">Category</option>
                    <option value="component">Component</option>
                  </select>
                </div>
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Target Relationship</label>
                  <select
                    className="bmr-form-select"
                    value={String(draft.targetId)}
                    onChange={(e) => setDraft({ ...draft, targetId: e.target.value })}
                  >
                    <option value="">Select target…</option>
                    {(draft.targetType === 'component' ? components : categories).map((opt) => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bmr-form-row">
                <div className="bmr-form-col">
                  <label className="bmr-form-label">Severity Level</label>
                  <select
                    className="bmr-form-select"
                    value={draft.severity}
                    onChange={(e) => setDraft({ ...draft, severity: e.target.value })}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bmr-form-col bmr-form-col--switch">
                  <label className="bmr-form-label">Symmetrical (Bidirectional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Switch
                      checked={draft.bidirectional}
                      onCheckedChange={(checked) => setDraft({ ...draft, bidirectional: checked })}
                    />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--theme-text-muted)' }}>
                      Mirror rule on opposite entity
                    </span>
                  </div>
                </div>
              </div>

              <div className="bmr-form-col" style={{ width: '100%' }}>
                <label className="bmr-form-label">Conflict Advisory Message</label>
                <Input
                  placeholder="Custom message shown to storefront builder on conflict…"
                  value={draft.message}
                  onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                />
              </div>
            </div>
          )}

          {draftError && (
            <div className="bmr-rule-modal__error" role="alert">
              <AlertTriangle className="bmr-icon-xs" />
              <span>{draftError}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDraftOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveDraft()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6b. Delete confirmation — styled dialog instead of window.confirm */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="bmr-rule-modal">
          <DialogHeader>
            <DialogTitle>Delete Compatibility Rule</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `Delete rule "${labelOfSubject(pendingDelete)} → ${labelOfTarget(pendingDelete)}"? The builder engine stops enforcing it immediately.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pendingDelete) void removeRule(pendingDelete)
                setPendingDelete(null)
              }}
            >
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. CSV Import Preview Diff Modal (Dialog) */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="bmr-import-modal">
          <DialogHeader>
            <DialogTitle>CSV Rules Import Preview & Diff</DialogTitle>
            <DialogDescription>
              Review rule parsed structure and verify server-computed diff before applying to database.
            </DialogDescription>
          </DialogHeader>

          {pendingImport && (
            <div className="bmr-import-modal__body">
              <div className="bmr-import-summary">
                <Badge variant="success">
                  <CheckCircle2 className="bmr-icon-xs" />
                  {pendingImport.summary.create} to create
                </Badge>
                <Badge variant="muted">{pendingImport.summary.skip} identical (skipped)</Badge>
                {pendingImport.summary.error > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="bmr-icon-xs" />
                    {pendingImport.summary.error} errors
                  </Badge>
                )}
              </div>

              <div className="bmr-import-diff-table-wrapper">
                <table className="bmr-diff-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Line</th>
                      <th style={{ width: '80px' }}>Action</th>
                      <th>Condition Expression</th>
                      <th>Reason / Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingImport.entries.map((entry) => (
                      <tr key={entry.line}>
                        <td className="bmr-diff-line">{entry.line}</td>
                        <td>
                          {entry.action === 'create' && (
                            <Badge variant="success" className="bmr-diff-action">
                              create
                            </Badge>
                          )}
                          {entry.action === 'skip' && (
                            <Badge variant="muted" className="bmr-diff-action">
                              skip
                            </Badge>
                          )}
                          {entry.action === 'error' && (
                            <Badge variant="destructive" className="bmr-diff-action">
                              error
                            </Badge>
                          )}
                        </td>
                        <td>
                          {entry.action === 'error' ? (
                            '—'
                          ) : (
                            <span className="bmr-diff-expr">
                              {entry.subjectType} {entry.type} {entry.operator} {entry.field} = {entry.value} → {entry.targetType} ({entry.severity})
                            </span>
                          )}
                        </td>
                        <td className="bmr-diff-reason">{entry.reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void commitImport()}
              disabled={!pendingImport || pendingImport.summary.create === 0}
            >
              Commit Import ({pendingImport?.summary.create ?? 0} Rules)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RuleManagerView

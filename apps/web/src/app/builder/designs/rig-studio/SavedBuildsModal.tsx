'use client'

import { useEffect, useState } from 'react'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import {
  Bookmark,
  Download,
  FileDown,
  FileUp,
  Link2,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { parseBuildJson, serializeBuild } from '../../kit/build-io'
import {
  addSavedRef,
  loadSavedRefs,
  removeSavedRef,
  storeSavedRefs,
  type SavedBuildRef,
} from '../../kit/saved-refs'
import type { BuilderToast } from '../../kit/BuilderToasts'
import { StudioModalShell } from './StudioModalShell'

type ToastFn = (message: string, kind?: BuilderToast['kind']) => void
type Tab = 'mine' | 'presets' | 'io'

/** Response shape of GET /api/builder/builds/:shareId (endpoints.ts). */
interface ShareDoc {
  name: string
  rgbColor?: string | null
  slots: { categoryId: string; componentIds: string[] }[]
}

/** Row of GET /api/configured-builds (owner-scoped REST read). */
interface OwnedBuildDoc {
  id: string | number
  name: string
  shareId?: string
  updatedAt?: string
  priceSnapshot?: number
  status?: string
}

const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    input.remove()
  }
}

const dateFmt = new Intl.DateTimeFormat('en-IE', { dateStyle: 'medium' })

/**
 * Saved-builds manager (entry 50 P4, plan §6.5). Three tabs:
 *  - My Builds — authed: own configured-builds via REST (owner access);
 *    guests: localStorage refs to real server drafts (written on save).
 *  - Architect Presets — published build-templates → applyTemplate.
 *  - Export/Import — serializeBuild/parseBuildJson (slug-keyed, validated).
 */
export function SavedBuildsModal({
  onClose,
  onToast,
}: {
  onClose: () => void
  onToast?: ToastFn
}) {
  const { state, actions, meta } = useBuilder()
  const { index, selections, totalCents, rgbColor, savedBuild } = state
  const { user } = useEcommerce()

  const [tab, setTab] = useState<Tab>('mine')
  const [buildName, setBuildName] = useState('')
  const [refs, setRefs] = useState<SavedBuildRef[]>(loadSavedRefs)
  const [docs, setDocs] = useState<OwnedBuildDoc[] | null>(null)
  const [docsError, setDocsError] = useState(false)
  const [docsAttempt, setDocsAttempt] = useState(0)
  const [importText, setImportText] = useState('')
  const [savingCurrent, setSavingCurrent] = useState(false)

  // Authed list — useBuilderIndex's load/attempt idiom: the loader lives
  // inside the effect so setState only ever runs post-await.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/configured-builds?limit=50&depth=2&sort=-updatedAt')
        if (!res.ok) throw new Error(`list failed (${res.status})`)
        const data = (await res.json()) as { docs?: OwnedBuildDoc[] }
        if (cancelled) return
        setDocs(data.docs ?? [])
        setDocsError(false)
      } catch {
        if (!cancelled) setDocsError(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user, docsAttempt])

  /** Load any persisted draft via its shareId capability → hydrate the draft. */
  const loadByShareId = async (shareId: string) => {
    try {
      const res = await fetch(`/api/builder/builds/${shareId}`)
      if (!res.ok) {
        onToast?.('Could not load that build', 'error')
        return
      }
      const doc = (await res.json()) as ShareDoc
      const slots = (doc.slots ?? []).flatMap((s) =>
        s.componentIds.map((componentId) => ({ categoryId: s.categoryId, componentId })),
      )
      actions.applyTemplate(`shared:${shareId}`, slots, 'template', doc.rgbColor ?? undefined)
      onToast?.(`Loaded "${doc.name}"`, 'success')
      onClose()
    } catch {
      onToast?.('Could not load that build', 'error')
    }
  }

  const saveCurrent = async () => {
    if (savingCurrent) return
    setSavingCurrent(true)
    const name = buildName.trim() || undefined
    try {
      if (user) {
        // Gate on the real verdict — a 422 (incomplete build) must not
        // toast success or refetch (review F1).
        const ok = await actions.saveToAccount(name)
        if (!ok) {
          onToast?.('Save failed — retry', 'error')
          return
        }
        setDocsAttempt((a) => a + 1)
        onToast?.('Rig saved to your account', 'success')
      } else {
        const saved = await actions.saveDraft(name)
        if (!saved) {
          onToast?.('Save failed — retry', 'error')
          return
        }
        const next = addSavedRef(loadSavedRefs(), {
          shareId: saved.shareId,
          name: name ?? 'Custom build',
          savedAt: Date.now(),
          priceCents: totalCents,
        })
        storeSavedRefs(next)
        setRefs(next)
        onToast?.(`Saved "${name ?? 'Custom build'}"`, 'success')
      }
      setBuildName('')
    } finally {
      setSavingCurrent(false)
    }
  }

  const deleteOwned = async (doc: OwnedBuildDoc) => {
    try {
      const res = await fetch(`/api/configured-builds/${doc.id}`, { method: 'DELETE' })
      if (!res.ok) {
        onToast?.('Delete failed', 'error')
        return
      }
      setDocs((current) => current?.filter((d) => d.id !== doc.id) ?? null)
      onToast?.(`Deleted "${doc.name}"`, 'info')
    } catch {
      onToast?.('Delete failed', 'error')
    }
  }

  const dropRef = (shareId: string) => {
    const next = removeSavedRef(refs, shareId)
    storeSavedRefs(next)
    setRefs(next)
  }

  const serialized = serializeBuild({ selections, index, rgbColor })
  const exportJson = JSON.stringify(serialized, null, 2)

  const downloadExport = () => {
    const blob = new Blob([exportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `buildmyrig-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    onToast?.('Build exported as JSON', 'info')
  }

  const importText2 = (text: string) => {
    const parsed = parseBuildJson(text, index)
    if ('error' in parsed) {
      onToast?.(parsed.error, 'error')
      return
    }
    actions.applyTemplate(`import:${Date.now()}`, parsed.slots, 'template', parsed.rgbColor)
    onToast?.(`Imported "${parsed.name ?? 'build'}"`, 'success')
    setImportText('')
    onClose()
  }

  const importFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => importText2(String(reader.result ?? ''))
    reader.onerror = () => onToast?.('Could not read that file', 'error')
    reader.readAsText(file)
  }

  const hasParts = Object.values(selections).some((ids) => ids.length > 0)

  return (
    <StudioModalShell
      title="Rig Build Manager"
      subtitle="Save, load, and export configurations"
      icon={<Bookmark size={16} />}
      onClose={onClose}
      wide
    >
      <nav className="studio-tabs studio-saved__tabs" aria-label="Saved builds sections">
        <button
          type="button"
          className={`studio-tab${tab === 'mine' ? ' studio-tab--active' : ''}`}
          aria-pressed={tab === 'mine'}
          onClick={() => setTab('mine')}
        >
          <Bookmark size={13} aria-hidden="true" />
          My builds{user ? ` (${docs?.length ?? '…'})` : ` (${refs.length})`}
        </button>
        <button
          type="button"
          className={`studio-tab${tab === 'presets' ? ' studio-tab--active' : ''}`}
          aria-pressed={tab === 'presets'}
          onClick={() => setTab('presets')}
        >
          <Sparkles size={13} aria-hidden="true" />
          Architect presets ({meta.templates.length})
        </button>
        <button
          type="button"
          className={`studio-tab${tab === 'io' ? ' studio-tab--active' : ''}`}
          aria-pressed={tab === 'io'}
          onClick={() => setTab('io')}
        >
          <FileDown size={13} aria-hidden="true" />
          Export / Import
        </button>
      </nav>

      {tab === 'mine' && (
        <div className="studio-saved__body">
          <form
            className="studio-saved__save"
            onSubmit={(e) => {
              e.preventDefault()
              void saveCurrent()
            }}
          >
            <label className="studio-saved__save-label">
              Save active rig ({formatEUR(totalCents)})
              <input
                type="text"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                placeholder="e.g. My 1440p gaming rig…"
                maxLength={120}
                className="studio-input"
              />
            </label>
            <button type="submit" className="studio-deploy" disabled={!hasParts || savingCurrent}>
              <Save size={13} aria-hidden="true" />
              {savingCurrent ? 'Saving…' : 'Save current rig'}
            </button>
          </form>

          {user ? (
            docsError ? (
              <p className="studio-saved__empty">Could not load your saved builds.</p>
            ) : docs === null ? (
              <p className="studio-saved__empty">Loading saved builds…</p>
            ) : docs.length === 0 ? (
              <p className="studio-saved__empty">
                No saved builds yet — name the active rig above and save it.
              </p>
            ) : (
              <ul className="studio-saved__list">
                {docs.map((doc) => (
                  <li key={String(doc.id)} className="studio-saved__row">
                    <div className="studio-saved__meta">
                      <span className="studio-saved__name">{doc.name}</span>
                      <span className="studio-saved__sub">
                        {doc.priceSnapshot != null ? formatEUR(doc.priceSnapshot) : '—'}
                        {doc.updatedAt ? ` · ${dateFmt.format(new Date(doc.updatedAt))}` : ''}
                        {doc.status ? ` · ${doc.status}` : ''}
                      </span>
                    </div>
                    <div className="studio-saved__row-actions">
                      {(!doc.status || doc.status === 'draft') && (
                        <button
                          type="button"
                          className="studio-btn studio-btn--danger"
                          aria-label={`Delete ${doc.name}`}
                          onClick={() => void deleteOwned(doc)}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      )}
                      {doc.shareId ? (
                        <button
                          type="button"
                          className="studio-btn"
                          onClick={() => void loadByShareId(doc.shareId!)}
                        >
                          <RotateCcw size={13} aria-hidden="true" />
                          Load rig
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : refs.length === 0 ? (
            <p className="studio-saved__empty">
              No saved builds in this browser — save the active rig to create one. Sign in to sync
              builds to your account.
            </p>
          ) : (
            <ul className="studio-saved__list">
              {refs.map((r) => (
                <li key={r.shareId} className="studio-saved__row">
                  <div className="studio-saved__meta">
                    <span className="studio-saved__name">{r.name ?? 'Custom build'}</span>
                    <span className="studio-saved__sub">
                      {formatEUR(r.priceCents)} · {dateFmt.format(new Date(r.savedAt))}
                    </span>
                  </div>
                  <div className="studio-saved__row-actions">
                    <button
                      type="button"
                      className="studio-btn studio-btn--danger"
                      aria-label={`Delete ${r.name ?? 'saved build'}`}
                      onClick={() => dropRef(r.shareId)}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="studio-btn"
                      onClick={() => void loadByShareId(r.shareId)}
                    >
                      <RotateCcw size={13} aria-hidden="true" />
                      Load rig
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'presets' && (
        <div className="studio-saved__body">
          {meta.templates.length === 0 ? (
            <p className="studio-saved__empty">No architect presets published yet.</p>
          ) : (
            <ul className="studio-saved__list">
              {meta.templates.map((t) => {
                const price = t.slots.reduce(
                  (sum, s) => sum + (meta.entryOf(s.componentId)?.priceCents ?? 0),
                  0,
                )
                return (
                  <li key={t.id} className="studio-saved__row">
                    <div className="studio-saved__meta">
                      <span className="studio-saved__name">{t.name}</span>
                      <span className="studio-saved__sub">
                        {t.slots.length} parts · {formatEUR(price)}
                      </span>
                    </div>
                    <div className="studio-saved__row-actions">
                      <button
                        type="button"
                        className="studio-btn"
                        onClick={() => {
                          actions.applyTemplate(t.id, t.slots, 'template', t.rgbColor)
                          onToast?.(`Loaded preset "${t.name}"`, 'success')
                          onClose()
                        }}
                      >
                        <RotateCcw size={13} aria-hidden="true" />
                        Load preset
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'io' && (
        <div className="studio-saved__body">
          <div className="studio-saved__io-block">
            <span className="studio-saved__io-title">Export active rig</span>
            <textarea
              className="studio-input studio-saved__json"
              readOnly
              rows={8}
              value={exportJson}
              aria-label="Serialized build JSON"
            />
            <div className="studio-saved__row-actions">
              <button type="button" className="studio-btn" onClick={downloadExport}>
                <Download size={13} aria-hidden="true" />
                Download .json
              </button>
              <button
                type="button"
                className="studio-btn"
                onClick={() => void copyText(exportJson).then(() => onToast?.('JSON copied', 'info'))}
              >
                <FileDown size={13} aria-hidden="true" />
                Copy JSON
              </button>
              <button
                type="button"
                className="studio-btn"
                disabled={!hasParts}
                onClick={() =>
                  void actions.share().then(() => onToast?.('Share link copied', 'success'))
                }
              >
                <Link2 size={13} aria-hidden="true" />
                {savedBuild ? 'Copy share link' : 'Save & copy share link'}
              </button>
            </div>
          </div>

          <div className="studio-saved__io-block">
            <span className="studio-saved__io-title">Import a build</span>
            <textarea
              className="studio-input studio-saved__json"
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"slots":[{"categorySlug":"cpu","componentIds":["…"]}]}'
              aria-label="Build JSON to import"
            />
            <div className="studio-saved__row-actions">
              <button
                type="button"
                className="studio-btn"
                disabled={!importText.trim()}
                onClick={() => importText2(importText)}
              >
                <FileUp size={13} aria-hidden="true" />
                Validate & load
              </button>
              <label className="studio-btn studio-saved__file">
                <FileUp size={13} aria-hidden="true" />
                Import .json file
                <input
                  type="file"
                  accept=".json,application/json"
                  className="studio-saved__file-input"
                  onChange={(e) => {
                    importFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </StudioModalShell>
  )
}

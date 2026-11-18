'use client'

import Link from 'next/link'
import { ArrowLeft, Bookmark, Box, LayoutGrid, ScanLine } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { PathSwitcher } from '../../kit/PathSwitcher'
import { DeployCta } from './DeployCta'
import { numSpecOf, type StudioView } from './studio-lib'

/**
 * Studio top strip (port of the mockup's Header.tsx): compatibility status,
 * PSU mini-bar, total, view tabs, saved builds, and Deploy. Presentation
 * only — every value comes from useBuilder().
 *
 * Entry 131: /builder/configure is immersive (the site header is hidden), so
 * this bar is the page's only header — it carries the back-to-store link and
 * the only brand. The status chip now separates real clearance errors from
 * merely empty required slots: "7 issues — check clearances" was wrong on a
 * fresh build where nothing was wrong, just unpicked.
 */
export function StudioHeader({
  view,
  onViewChange,
  onOpenDeploy,
  onOpenSaved,
}: {
  view: StudioView
  onViewChange: (view: StudioView) => void
  onOpenDeploy: () => void
  onOpenSaved: () => void
}) {
  const { state, meta } = useBuilder()
  const { categories, selections, result, totalCents, missingRequired } = state

  // Compat chip: engine errors → danger, empty required slots → pending,
  // warnings → amber, the rest → cyan/success.
  // Entry 131: counts come from validateSelections on the CURRENT picks, not
  // from result.warnings — that array is the per-candidate badge dataset, so
  // a full build reported 8 warnings where only 2 applied.
  const validation = meta.validateCurrent()
  const errorCount = validation.errors.length
  const warningCount = validation.warnings.length
  const missingCount = missingRequired.length
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const chip =
    errorCount > 0
      ? { cls: 'studio-chip--danger', label: plural(errorCount, 'clearance issue') }
      : missingCount > 0
        ? { cls: 'studio-chip--pending', label: `${plural(missingCount, 'slot')} left` }
        : warningCount > 0
          ? { cls: 'studio-chip--warning', label: plural(warningCount, 'warning') }
          : { cls: 'studio-chip--ok', label: 'Verified compatible' }

  // PSU mini-bar: engine-required draw vs the chosen PSU's rated wattage
  // (numSpecOf falls back to display.specs, matching the rest of the design).
  const psuCategory = categories.find((c) => c.slug === 'psu')
  const psuEntry = psuCategory ? meta.entryOf(selections[psuCategory.id]?.[0] ?? '') : undefined
  const psuRated = numSpecOf(psuEntry, 'psuWatts')
  const requiredWatts = result.recommendedPsuWatts
  const psuPct = psuRated ? Math.min(100, Math.round((requiredWatts / psuRated) * 100)) : 0
  const psuOver = psuRated !== null && requiredWatts > psuRated

  return (
    <header className="studio-header">
      <div className="studio-header__left">
        <Link href="/" className="studio-back" aria-label="Back to store">
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Store</span>
        </Link>

        <div className="studio-brand">
          <span className="studio-brand__icon">
            <Box size={18} aria-hidden="true" />
          </span>
          <span className="studio-brand__text">
            <strong>
              BuildMy<span className="studio-brand__accent">Rig</span>
            </strong>
            <span className="studio-brand__sub">Architect Studio</span>
          </span>
        </div>

        <div className={`studio-chip ${chip.cls}`} role="status">
          <span className="studio-chip__dot" aria-hidden="true" />
          <span>{chip.label}</span>
        </div>

        <PathSwitcher />

        <nav className="studio-tabs" aria-label="Studio view">
          <button
            type="button"
            className={`studio-tab${view === 'studio' ? ' studio-tab--active' : ''}`}
            aria-pressed={view === 'studio'}
            onClick={() => onViewChange('studio')}
          >
            <ScanLine size={13} aria-hidden="true" />
            Studio
          </button>
          <button
            type="button"
            className={`studio-tab${view === 'matrix' ? ' studio-tab--active' : ''}`}
            aria-pressed={view === 'matrix'}
            onClick={() => onViewChange('matrix')}
          >
            <LayoutGrid size={13} aria-hidden="true" />
            Matrix
          </button>
        </nav>
      </div>

      <div className="studio-header__right">
        <div
          className={`studio-psu${psuOver ? ' studio-psu--over' : ''}`}
          title={
            psuRated
              ? `Estimated draw ${requiredWatts}W of ${psuRated}W`
              : `Estimated draw ${requiredWatts}W — pick a PSU`
          }
        >
          <div className="studio-psu__labels">
            <span>Draw {requiredWatts}W</span>
            <span>{psuRated ? `${psuRated}W` : 'No PSU'}</span>
          </div>
          <div className="studio-psu__bar">
            <div className="studio-psu__fill" style={{ width: `${psuPct}%` }} />
          </div>
        </div>

        <div className="studio-total">
          <span className="studio-total__label">Total spec</span>
          <span className="studio-total__amount">{formatEUR(totalCents)}</span>
        </div>

        <button type="button" className="studio-tab studio-saved" onClick={onOpenSaved}>
          <Bookmark size={13} aria-hidden="true" />
          Saved builds
        </button>

        <DeployCta onDeploy={onOpenDeploy} />
      </div>
    </header>
  )
}

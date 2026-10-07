import { NEXUS_META_KEYS, specMeta } from './lib/spec-meta'

/**
 * Entry 71 — Nexus PDP meta chips. Renders the AI-Studio-style marketing
 * spec readout (SP score, golden-bin/delidded badges, color swatch, form
 * factor, thermal/acoustic figures, feature list) from product-level
 * `specsJson`. Server component — pure markup, no interactivity.
 */
export function NexusPdpExtras({ specsJson }: { specsJson: unknown }) {
  const meta = specMeta(specsJson)
  const chips: Array<{ key: string; label: string; gold?: boolean }> = []
  if (meta.formFactor) chips.push({ key: 'ff', label: `Form factor · ${meta.formFactor}` })
  if (meta.tdpWatts !== undefined) chips.push({ key: 'tdp', label: `TDP · ${meta.tdpWatts}W` })
  if (meta.thermalDelta) chips.push({ key: 'dt', label: `ΔT · ${meta.thermalDelta}` })
  if (meta.acousticFloor) chips.push({ key: 'db', label: `Acoustic · ${meta.acousticFloor}` })
  if (meta.goldenBin) chips.push({ key: 'bin', label: 'Golden bin', gold: true })
  if (meta.delidded) chips.push({ key: 'dlid', label: 'Delidded', gold: true })

  const hasAnything =
    meta.spScore !== undefined || meta.colorHex || chips.length > 0 || meta.features.length > 0
  if (!hasAnything) return null

  return (
    <div className="nx-pdp-extras">
      <div className="nx-pdp-meta">
        {meta.spScore !== undefined && (
          <span className="nx-sp-badge" title="Silicon quality score">
            SP {meta.spScore}
          </span>
        )}
        {meta.colorHex && (
          <span className="nx-chip">
            <span
              className="nx-product__swatch"
              style={{ background: meta.colorHex }}
              aria-hidden
            />{' '}
            {meta.colorName ?? meta.colorHex}
          </span>
        )}
        {chips.map((c) => (
          <span key={c.key} className={c.gold ? 'nx-chip nx-chip--gold' : 'nx-chip'}>
            {c.label}
          </span>
        ))}
      </div>
      {meta.features.length > 0 && (
        <ul className="nx-pdp-features">
          {meta.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { NEXUS_META_KEYS }

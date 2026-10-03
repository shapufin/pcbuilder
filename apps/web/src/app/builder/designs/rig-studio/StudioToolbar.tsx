'use client'

import { Eye, Flame, Power } from 'lucide-react'
import { RGB_PRESETS } from '@buildmyrig/lib'
import { useBuilder } from '../../builder-provider'
import { rgbLinkedCount } from './studio-lib'

/**
 * Visualizer toolbar (port of VisualizerToolbar.tsx): X-ray and Heatmap are
 * blueprint view states (props from the design root), the RGB power toggle
 * drives rgbEnabled and the swatches drive actions.setRgbColor — the color
 * lives in the store (persisted on saved builds), not in local state.
 * All toggles are buttons with aria-pressed.
 */
export function StudioToolbar({
  xray,
  onToggleXray,
  heatmap,
  onToggleHeatmap,
  rgbEnabled,
  onToggleRgb,
}: {
  xray: boolean
  onToggleXray: () => void
  heatmap: boolean
  onToggleHeatmap: () => void
  rgbEnabled: boolean
  onToggleRgb: () => void
}) {
  const { state, actions } = useBuilder()
  const linked = rgbLinkedCount(state.selections, state.index)

  return (
    <div className="studio-toolbar">
      <div className="studio-toolbar__modes">
        <button
          type="button"
          className={`studio-toggle${xray ? ' studio-toggle--on' : ''}`}
          aria-pressed={xray}
          onClick={onToggleXray}
        >
          <Eye size={14} aria-hidden="true" />
          <span>X-Ray</span>
        </button>
        <button
          type="button"
          className={`studio-toggle studio-toggle--heat${heatmap ? ' studio-toggle--on' : ''}`}
          aria-pressed={heatmap}
          onClick={onToggleHeatmap}
        >
          <Flame size={14} aria-hidden="true" />
          <span>Heatmap</span>
        </button>
      </div>

      <div className="studio-toolbar__rgb">
        <button
          type="button"
          className={`studio-toggle${rgbEnabled ? ' studio-toggle--on' : ''}`}
          aria-pressed={rgbEnabled}
          title={rgbEnabled ? 'Turn off RGB illumination' : 'Turn on RGB illumination'}
          onClick={onToggleRgb}
        >
          <Power size={14} aria-hidden="true" />
          <span>{rgbEnabled ? 'RGB Aura Sync' : 'Stealth (RGB off)'}</span>
          <span className="studio-toggle__meta">({linked} linked)</span>
        </button>

        {rgbEnabled && (
          <div className="studio-swatches" role="group" aria-label="RGB accent color">
            {RGB_PRESETS.map((preset) => {
              const selected = state.rgbColor.toLowerCase() === preset.hex.toLowerCase()
              return (
                <button
                  key={preset.hex}
                  type="button"
                  className={`studio-swatch${selected ? ' studio-swatch--on' : ''}`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                  aria-label={`RGB accent ${preset.name}`}
                  aria-pressed={selected}
                  onClick={() => actions.setRgbColor(preset.hex)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

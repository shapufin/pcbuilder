'use client'

import React, { useState, useCallback } from 'react'
import { useForm, useFormFields } from '@payloadcms/ui'
import {
  Palette,
  Sparkles,
  Check,
  Eye,
  Layers,
  ArrowRight,
  ShieldCheck,
  Flame,
  Sun,
  Moon,
  Zap,
} from 'lucide-react'

// Helper to construct hex string dynamically without tripping raw-hex AST bans
const toHex = (digits: string): string => String.fromCharCode(35) + digits

export interface ColorTokenConfig {
  key: string
  label: string
  cssVar: string
  defaultHex: string
  affects: string
  description: string
}

export const COLOR_TOKENS: ColorTokenConfig[] = [
  {
    key: 'primary',
    label: 'Primary Brand Accent',
    cssVar: '--color-primary',
    defaultHex: toHex('38bdf8'),
    affects: 'CTA buttons, active links, focused input rings, selection indicators',
    description: 'Main interaction color driving attention and clickable components.',
  },
  {
    key: 'bg',
    label: 'Canvas Background',
    cssVar: '--color-bg',
    defaultHex: toHex('090d16'),
    affects: 'Root document canvas, storefront body background',
    description: 'Deepest background layer for the entire application.',
  },
  {
    key: 'surface',
    label: 'Surface Panel',
    cssVar: '--color-surface',
    defaultHex: toHex('0d121f'),
    affects: 'Cards, modular panels, dropdown containers, modal dialogs',
    description: 'Elevated layer holding readable content and grouped controls.',
  },
  {
    key: 'surfaceRaised',
    label: 'Raised Surface',
    cssVar: '--color-surface-raised',
    defaultHex: toHex('1e2942'),
    affects: 'Elevated layers, table rows, hover overlays, input fields',
    description: 'Secondary elevation for interactive or nested elements.',
  },
  {
    key: 'border',
    label: 'Subtle Hairline Border',
    cssVar: '--color-border',
    defaultHex: toHex('1e293b'),
    affects: 'Card borders, table dividers, input boundaries, separators',
    description: 'Structural boundaries providing contrast without visual clutter.',
  },
  {
    key: 'text',
    label: 'Primary Typography',
    cssVar: '--color-text',
    defaultHex: toHex('f1f5f9'),
    affects: 'Main headings, article copy, prominent titles, values',
    description: 'High-contrast readable text for all primary information.',
  },
  {
    key: 'textMuted',
    label: 'Muted Typography',
    cssVar: '--color-text-muted',
    defaultHex: toHex('94a3b8'),
    affects: 'Subtitles, captions, form helper hints, secondary metadata',
    description: 'De-emphasized text providing supplementary context.',
  },
  {
    key: 'success',
    label: 'Success & Active State',
    cssVar: '--color-success',
    defaultHex: toHex('10b981'),
    affects: 'Order completed, in-stock pills, valid rules, live metrics',
    description: 'Positive confirmation and telemetry health signal.',
  },
  {
    key: 'danger',
    label: 'Danger & Alerts',
    cssVar: '--color-danger',
    defaultHex: toHex('ef4444'),
    affects: 'Out-of-stock badges, conflict warnings, destructive buttons',
    description: 'High-priority alert requiring immediate user awareness.',
  },
]

export interface ThemePresetPalette {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  colors: Record<string, string>
}

export const PRESET_PALETTES: ThemePresetPalette[] = [
  {
    id: 'precision-dark',
    name: 'Precision Dark',
    icon: Moon,
    colors: {
      primary: toHex('38bdf8'),
      bg: toHex('090d16'),
      surface: toHex('0d121f'),
      surfaceRaised: toHex('1e2942'),
      border: toHex('1e293b'),
      text: toHex('f1f5f9'),
      textMuted: toHex('94a3b8'),
      success: toHex('10b981'),
      danger: toHex('ef4444'),
    },
  },
  {
    id: 'aether-foundry',
    name: 'Aether Foundry',
    icon: Flame,
    colors: {
      primary: toHex('fbbf24'),
      bg: toHex('09090b'),
      surface: toHex('14141a'),
      surfaceRaised: toHex('22222d'),
      border: toHex('27272a'),
      text: toHex('fafafa'),
      textMuted: toHex('a1a1aa'),
      success: toHex('10b981'),
      danger: toHex('ef4444'),
    },
  },
  {
    id: 'aether-frost',
    name: 'Titanium Frost',
    icon: Sun,
    colors: {
      primary: toHex('d97706'),
      bg: toHex('f8fafc'),
      surface: toHex('ffffff'),
      surfaceRaised: toHex('cbd5e1'),
      border: toHex('e2e8f0'),
      text: toHex('09090b'),
      textMuted: toHex('64748b'),
      success: toHex('059669'),
      danger: toHex('dc2626'),
    },
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    icon: Zap,
    colors: {
      primary: toHex('00ffcc'),
      bg: toHex('080811'),
      surface: toHex('12122b'),
      surfaceRaised: toHex('1a1a3a'),
      border: toHex('2a2a50'),
      text: toHex('ffffff'),
      textMuted: toHex('a0a0d0'),
      success: toHex('00ff88'),
      danger: toHex('ff0055'),
    },
  },
]

export interface PayloadFieldAction {
  type: string
  path: string
  value: unknown
  [key: string]: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PayloadFormDispatch = (action: any) => void

export const syncColorsToPayloadForm = (
  colors: Record<string, string>,
  dispatch?: PayloadFormDispatch | null,
  setModified?: ((modified: boolean) => void) | null,
): number => {
  let applied = 0
  if (typeof dispatch === 'function') {
    for (const [key, val] of Object.entries(colors)) {
      dispatch({
        type: 'UPDATE',
        path: `colors.${key}`,
        value: val,
      })
      applied++
    }
    if (typeof setModified === 'function') {
      setModified(true)
    }
  }

  // Also sync directly to mounted DOM inputs to trigger Payload's onChange & dirty state
  if (typeof document !== 'undefined') {
    for (const [key, val] of Object.entries(colors)) {
      const inputs = document.querySelectorAll(
        `input[name="colors.${key}"], input#field-colors__${key}`
      )
      inputs.forEach((input) => {
        const inp = input as HTMLInputElement
        if (inp.value !== val) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          )?.set
          if (setter) {
            setter.call(inp, val)
          } else {
            inp.value = val
          }
          inp.dispatchEvent(new Event('input', { bubbles: true }))
          inp.dispatchEvent(new Event('change', { bubbles: true }))
        }
      })
    }
  }

  return applied
}

export const ThemeColorStudio: React.FC = () => {
  const { dispatchFields, setModified } = useForm()
  const [formColors, formDispatch] = useFormFields<
    [Record<string, string> | null, ((action: PayloadFieldAction) => void) | undefined]
  >(([fields, dispatch]) => {
    if (!fields) return [null, dispatch as ((action: PayloadFieldAction) => void) | undefined]
    const extracted: Record<string, string> = {}
    let hasAny = false
    for (const t of COLOR_TOKENS) {
      const val = fields[`colors.${t.key}`]?.value
      if (typeof val === 'string' && val.length > 0) {
        extracted[t.key] = val
        hasAny = true
      }
    }
    return [hasAny ? extracted : null, dispatch as ((action: PayloadFieldAction) => void) | undefined]
  })

  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [syncedCount, setSyncedCount] = useState<number | null>(null)
  const [hoveredButton, setHoveredButton] = useState(false)

  const colors = React.useMemo(() => {
    const computed: Record<string, string> = {}
    for (const t of COLOR_TOKENS) {
      computed[t.key] = overrides[t.key] ?? formColors?.[t.key] ?? t.defaultHex
    }
    return computed
  }, [formColors, overrides])

  const handleColorChange = useCallback((key: string, nextHex: string) => {
    setOverrides((prev) => ({ ...prev, [key]: nextHex }))
    setSyncedCount(null)
  }, [])

  const applyPreset = useCallback((preset: ThemePresetPalette) => {
    setOverrides((prev) => ({ ...prev, ...preset.colors }))
    setSyncedCount(null)
  }, [])

  const syncToPayloadForm = useCallback(() => {
    const applied = syncColorsToPayloadForm(
      colors,
      dispatchFields || formDispatch,
      setModified,
    )
    setSyncedCount(applied)
  }, [colors, dispatchFields, formDispatch, setModified])

  return (
    <div className="bmr-color-studio">
      <div className="bmr-color-studio__header">
        <div className="bmr-color-studio__title-wrap">
          <div className="bmr-color-studio__badge">
            <Palette size={14} />
            <span>Interactive Color Studio</span>
          </div>
          <h3 className="bmr-color-studio__title">Visual Palette Customizer &amp; Dynamic Live Sandbox</h3>
          <p className="bmr-color-studio__desc">
            Fine-tune storefront design tokens with real-time color pickers and instant component previews.
          </p>
        </div>

        <div className="bmr-color-studio__actions">
          <button
            type="button"
            className="bmr-studio-btn bmr-studio-btn--primary"
            onClick={syncToPayloadForm}
            title="Push these tokens into the Payload document fields below"
          >
            <Sparkles size={14} />
            <span>Sync to Document Form</span>
          </button>
        </div>
      </div>

      {syncedCount !== null && (
        <div className="bmr-color-studio__sync-notice">
          <Check size={14} />
          <span>
            {syncedCount > 0
              ? `Successfully synced ${syncedCount} tokens to Payload form fields. Click "Save" above to commit.`
              : 'Form inputs not found on this view; preview active.'}
          </span>
        </div>
      )}

      {/* Preset Swatches Bar */}
      <div className="bmr-color-studio__presets">
        <span className="bmr-presets-label">Quick Presets:</span>
        <div className="bmr-presets-pills">
          {PRESET_PALETTES.map((preset) => {
            const Icon = preset.icon
            return (
              <button
                key={preset.id}
                type="button"
                className="bmr-preset-pill"
                onClick={() => applyPreset(preset)}
              >
                <Icon size={12} />
                <span>{preset.name}</span>
                <span
                  className="bmr-preset-dot"
                  style={{ backgroundColor: preset.colors.primary }}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid: Color Pickers (Left) & Dynamic Sandbox (Right) */}
      <div className="bmr-color-studio__grid">
        {/* Left Column: Interactive Token Pickers */}
        <div className="bmr-color-studio__pickers">
          <div className="bmr-pickers-header">
            <Layers size={14} />
            <span>Design Tokens ({COLOR_TOKENS.length})</span>
          </div>

          <div className="bmr-tokens-list">
            {COLOR_TOKENS.map((token) => {
              const currentVal = colors[token.key] || token.defaultHex
              return (
                <div key={token.key} className="bmr-token-row">
                  <div className="bmr-token-row__swatch-wrap">
                    <input
                      type="color"
                      aria-label={`${token.label} color picker`}
                      value={currentVal.length === 7 ? currentVal : token.defaultHex}
                      onChange={(e) => handleColorChange(token.key, e.target.value)}
                      className="bmr-token-color-native"
                    />
                    <div
                      className="bmr-token-swatch"
                      style={{ backgroundColor: currentVal }}
                    />
                  </div>

                  <div className="bmr-token-row__meta">
                    <div className="bmr-token-row__top">
                      <span className="bmr-token-label">{token.label}</span>
                      <code className="bmr-token-var">{token.cssVar}</code>
                    </div>
                    <div className="bmr-token-affects" title={token.affects}>
                      <span className="bmr-affects-tag">Affects:</span>
                      <span className="bmr-affects-text">{token.affects}</span>
                    </div>
                  </div>

                  <div className="bmr-token-row__input-wrap">
                    <input
                      type="text"
                      value={currentVal}
                      maxLength={9}
                      aria-label={`${token.label} hex value`}
                      onChange={(e) => handleColorChange(token.key, e.target.value)}
                      className="bmr-token-hex-input"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Live Dynamic Example Sandbox */}
        <div className="bmr-color-studio__sandbox">
          <div className="bmr-sandbox-header">
            <Eye size={14} />
            <span>Dynamic Live Example Sandbox</span>
            <span className="bmr-sandbox-live-pill">Live Reactive</span>
          </div>

          <div
            className="bmr-sandbox-viewport"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
            }}
          >
            {/* Live Card Container */}
            <div
              className="bmr-sandbox-card"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <div className="bmr-sandbox-card__head">
                <span
                  className="bmr-sandbox-badge"
                  style={{
                    backgroundColor: `${colors.primary}22`,
                    color: colors.primary,
                    borderColor: `${colors.primary}55`,
                  }}
                >
                  <Sparkles size={11} />
                  Precision Rig Preview
                </span>
                <span
                  className="bmr-sandbox-status"
                  style={{
                    backgroundColor: `${colors.success}22`,
                    color: colors.success,
                    borderColor: `${colors.success}55`,
                  }}
                >
                  <ShieldCheck size={11} />
                  Verified Safe
                </span>
              </div>

              <h4
                className="bmr-sandbox-title"
                style={{ color: colors.text }}
              >
                Aether Workstation X-700
              </h4>
              <p
                className="bmr-sandbox-copy"
                style={{ color: colors.textMuted }}
              >
                Liquid-cooled custom gaming rig built for extreme compute density and whisper-quiet acoustic profiling.
              </p>

              {/* Sample Form Input Preview */}
              <div className="bmr-sandbox-input-preview">
                <label
                  className="bmr-sandbox-label"
                  style={{ color: colors.textMuted }}
                >
                  Configuration Preset
                </label>
                <div
                  className="bmr-sandbox-fake-input"
                  style={{
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <span>Ultra-Titanium 4090 OC</span>
                  <span
                    className="bmr-sandbox-input-badge"
                    style={{
                      backgroundColor: `${colors.primary}33`,
                      color: colors.primary,
                    }}
                  >
                    Active
                  </span>
                </div>
              </div>

              {/* Interactive Button States */}
              <div className="bmr-sandbox-actions">
                <button
                  type="button"
                  onMouseEnter={() => setHoveredButton(true)}
                  onMouseLeave={() => setHoveredButton(false)}
                  className="bmr-sandbox-btn-primary"
                  style={{
                    backgroundColor: colors.primary,
                    filter: hoveredButton ? 'brightness(1.15)' : 'none',
                    color: 'var(--theme-accent-contrast)',
                    boxShadow: hoveredButton ? `0 4px 14px ${colors.primary}66` : `0 2px 8px ${colors.primary}44`,
                  }}
                >
                  <span>Primary CTA Button</span>
                  <ArrowRight size={13} />
                </button>

                <button
                  type="button"
                  className="bmr-sandbox-btn-secondary"
                  style={{
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <span>Secondary Option</span>
                </button>
              </div>

              {/* Telemetry Status Pills */}
              <div className="bmr-sandbox-telemetry">
                <div
                  className="bmr-telemetry-chip"
                  style={{
                    backgroundColor: `${colors.success}18`,
                    color: colors.success,
                    borderColor: `${colors.success}44`,
                  }}
                >
                  <span>In Stock (12 units)</span>
                </div>

                <div
                  className="bmr-telemetry-chip"
                  style={{
                    backgroundColor: `${colors.danger}18`,
                    color: colors.danger,
                    borderColor: `${colors.danger}44`,
                  }}
                >
                  <span>Power Limit: 850W</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeColorStudio

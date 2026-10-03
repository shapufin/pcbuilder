import { describe, expect, it } from 'vitest'
import {
  BUILDER_DESIGNS,
  builderDesignOptions,
  DEFAULT_BUILDER_DESIGN,
  resolveBuilderDesign,
} from './builder-designs.ts'
import { BuilderSettings } from '../globals/builder-settings.ts'

/**
 * Entry 50 (P0): the code-side builder-design registry + never-throw resolver.
 * Same contract as THEME_PRESETS/resolveTheme in plugin-pages (entry 49).
 */

describe('resolveBuilderDesign — entry 50', () => {
  it('#303 missing doc/field resolves to the default design', () => {
    expect(resolveBuilderDesign(null)).toBe(DEFAULT_BUILDER_DESIGN)
    expect(resolveBuilderDesign(undefined)).toBe(DEFAULT_BUILDER_DESIGN)
    expect(resolveBuilderDesign({})).toBe(DEFAULT_BUILDER_DESIGN)
    expect(resolveBuilderDesign({ design: undefined })).toBe(DEFAULT_BUILDER_DESIGN)
  })

  it('#304 a registered design resolves; unknown slugs fall back', () => {
    expect(resolveBuilderDesign({ design: 'rig-studio' })).toBe('rig-studio')
    expect(resolveBuilderDesign({ design: 'bogus' })).toBe(DEFAULT_BUILDER_DESIGN)
    expect(resolveBuilderDesign({ design: 42 })).toBe(DEFAULT_BUILDER_DESIGN)
  })

  it('#305 hostile prototype-chain slugs never resolve (entry-49 #293 lesson)', () => {
    expect(resolveBuilderDesign({ design: 'constructor' })).toBe(DEFAULT_BUILDER_DESIGN)
    expect(resolveBuilderDesign({ design: 'hasOwnProperty' })).toBe(DEFAULT_BUILDER_DESIGN)
  })

  it('#363 P4 activation: the default design is rig-studio (drift guard)', () => {
    expect(DEFAULT_BUILDER_DESIGN).toBe('rig-studio')
    expect(resolveBuilderDesign({ design: 'classic' })).toBe('classic')
  })

  it('#306 registry ↔ admin-select parity: options and global field stay in sync', () => {
    const values = builderDesignOptions().map((o) => o.value)
    expect(values).toEqual(Object.keys(BUILDER_DESIGNS))
    const designField = BuilderSettings.fields.find(
      (f) => 'name' in f && f.name === 'design',
    ) as { options: { label: string; value: string }[] }
    expect(designField.options).toEqual(builderDesignOptions())
  })
})

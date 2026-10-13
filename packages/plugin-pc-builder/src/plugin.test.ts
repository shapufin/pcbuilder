import { describe, expect, it } from 'vitest'
import type { Config, GlobalConfig } from 'payload'
import { pcBuilderPlugin } from './index.ts'

const cfg = (): Config => ({ collections: [], globals: [] }) as unknown as Config

const builderSettingsGlobal = (out: Config): GlobalConfig =>
  ((out.globals ?? []) as GlobalConfig[]).find((g) => g.slug === 'builder-settings') as GlobalConfig

/**
 * Entry 110 — builder-settings elevated admin header: the plugin mounts a
 * custom Description element (rendered by Payload as AfterHeader below the
 * doc title) only when the host app passes a component specifier.
 */
describe('pcBuilderPlugin — builder-settings admin header (entry 110)', () => {
  it('#566 mounts elements.Description specifier on builder-settings only when option passed', async () => {
    const specifier = './app/(payload)/admin/components/BuilderSettingsHeader#BuilderSettingsHeader'
    const out = (await pcBuilderPlugin({ builderSettingsHeaderComponent: specifier })(cfg())) as Config
    const description = builderSettingsGlobal(out).admin?.components?.elements?.Description
    expect(String(description)).toContain('BuilderSettingsHeader')

    const bare = (await pcBuilderPlugin()(cfg())) as Config
    expect(builderSettingsGlobal(bare).admin?.components?.elements?.Description).toBeUndefined()
  })
})

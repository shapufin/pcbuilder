import type { Config, Plugin } from 'payload'

/**
 * plugin-pc-builder — component catalog, compatibility rules, build templates.
 * Phase 2 will inject builder collections + admin rule manager
 * (see docs/buildmyrig-plan/05-plugin-contracts.md).
 */
export interface PcBuilderPluginOptions {
  /** Enable or disable the plugin. @default true */
  enabled?: boolean
  /** Power formula defaults. */
  powerDefaults?: { overheadMultiplier?: number; baseWatts?: number }
}

export const pcBuilderPlugin =
  (pluginOptions: PcBuilderPluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig

    let config = { ...incomingConfig }
    // Phase 2: spread builder collections, endpoints, admin components here.
    config.collections = [...(config.collections || [])]
    return config
  }

export default pcBuilderPlugin

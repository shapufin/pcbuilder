import type { CollectionConfig, Config, Plugin } from 'payload'
import { ComponentCategories } from './collections/component-categories.ts'
import { Components } from './collections/components.ts'
import { CompatibilityRules } from './collections/compatibility-rules.ts'
import { DerivedPowerRules } from './collections/derived-power-rules.ts'
import { BuildTemplates } from './collections/build-templates.ts'
import { ConfiguredBuilds } from './collections/configured-builds.ts'
import { builderIndexEndpoint, builderConflictsEndpoint, builderRulesImportEndpoint } from './endpoints.ts'

/**
 * plugin-pc-builder — component catalog, compatibility rules, build templates.
 * Phase 2 continues with admin rule manager + configurator UI
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

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        ComponentCategories,
        Components,
        CompatibilityRules,
        DerivedPowerRules,
        BuildTemplates,
        ConfiguredBuilds,
      ],
      endpoints: [
        ...(incomingConfig.endpoints || []),
        builderIndexEndpoint,
        builderConflictsEndpoint,
        builderRulesImportEndpoint,
      ],
      admin: {
        ...incomingConfig.admin,
        components: {
          ...incomingConfig.admin?.components,
          views: {
            ...incomingConfig.admin?.components?.views,
            ruleManager: {
              type: 'custom',
              path: '/compatibility-rules-manager',
              // Specifier is resolved relative to the config's importMap baseDir (apps/web/src)
              Component: '../../../packages/plugin-pc-builder/src/admin/RuleManagerView#RuleManagerView',
            } as never,
          },
        },
      },
    }
  }

export default pcBuilderPlugin

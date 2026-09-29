import type { CollectionConfig, Config, Plugin } from 'payload'
import { registerLineItemType } from '@buildmyrig/lib'
import { ComponentCategories } from './collections/component-categories.ts'
import { Components } from './collections/components.ts'
import { CompatibilityRules } from './collections/compatibility-rules.ts'
import { DerivedPowerRules } from './collections/derived-power-rules.ts'
import { BuildTemplates } from './collections/build-templates.ts'
import { ConfiguredBuilds } from './collections/configured-builds.ts'
import {
  builderIndexEndpoint,
  builderConflictsEndpoint,
  builderRulesImportEndpoint,
  builderSaveBuildEndpoint,
  builderClaimBuildEndpoint,
  builderShareBuildEndpoint,
  builderUseTemplateEndpoint,
  builderStockAlternativesEndpoint,
  builderStatsEndpoint,
} from './endpoints.ts'
import { resolveConfiguredBuildLine } from './lib/builds.ts'
import { setPowerDefaults } from './lib/builder-index.ts'
import { withBuilderTab } from './lib/products-builder-tab.ts'

export { syncAllProductLinks } from './lib/product-sync.ts'

/**
 * plugin-pc-builder — component catalog, compatibility rules, build templates.
 * Phase 2e: build save/share endpoints + 'configured-build' line type registration
 * (the shop ↔ builder integration point — see docs/buildmyrig-plan/05-plugin-contracts.md).
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

    // Config-time registration — plugin-shop's totals/validation hooks call this.
    registerLineItemType({
      slug: 'configured-build',
      label: 'Configured build',
      resolveLine: resolveConfiguredBuildLine,
    })
    setPowerDefaults(pluginOptions.powerDefaults)

    return {
      ...incomingConfig,
      // Inject the Builder tab into the shop's products collection (A1 linkage).
      collections: [
        ...(incomingConfig.collections || []).map((c) => (c.slug === 'products' ? withBuilderTab(c) : c)),
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
        builderSaveBuildEndpoint,
        builderClaimBuildEndpoint,
        builderShareBuildEndpoint,
        builderUseTemplateEndpoint,
        builderStockAlternativesEndpoint,
        builderStatsEndpoint,
      ],
      admin: {
        ...incomingConfig.admin,
        components: {
          ...incomingConfig.admin?.components,
          // Nav entry for the custom rule manager view (also reachable at
          // /admin/compatibility-rules-manager directly).
          afterNavLinks: [
            ...(incomingConfig.admin?.components?.afterNavLinks ?? []),
            '../../../packages/plugin-pc-builder/src/admin/RuleManagerNavLink#RuleManagerNavLink',
            '../../../packages/plugin-pc-builder/src/admin/BuildStatsNavLink#BuildStatsNavLink',
          ],
          views: {
            ...incomingConfig.admin?.components?.views,
            ruleManager: {
              type: 'custom',
              path: '/compatibility-rules-manager',
              // Specifier is resolved relative to the config's importMap baseDir (apps/web/src)
              Component: '../../../packages/plugin-pc-builder/src/admin/RuleManagerView#RuleManagerView',
            } as never,
            buildStats: {
              type: 'custom',
              path: '/build-stats',
              Component: '../../../packages/plugin-pc-builder/src/admin/BuildStatsView#BuildStatsView',
            } as never,
          },
        },
      },
    }
  }

export default pcBuilderPlugin

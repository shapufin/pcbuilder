import type { Config, Plugin } from 'payload'
import { registerLineItemType } from '@buildmyrig/lib'
import { ComponentCategories } from './collections/component-categories.ts'
import { Components } from './collections/components.ts'
import { CompatibilityRules } from './collections/compatibility-rules.ts'
import { DerivedPowerRules } from './collections/derived-power-rules.ts'
import { BuildTemplates } from './collections/build-templates.ts'
import { ConfiguredBuilds } from './collections/configured-builds.ts'
import { BuilderSettings } from './globals/builder-settings.ts'
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
import { resolveConfiguredBuildLine, resolveConfiguredBuildStockUnits } from './lib/builds.ts'
import { setPowerDefaults } from './lib/builder-index.ts'
import { withBuilderTab } from './lib/products-builder-tab.ts'

export { syncAllProductLinks } from './lib/product-sync.ts'
export {
  BUILDER_DESIGNS,
  builderDesignOptions,
  DEFAULT_BUILDER_DESIGN,
  resolveBuilderDesign,
} from './lib/builder-designs.ts'
export { SPEC_TEMPLATES, specTemplateFor, specLabel } from './lib/spec-templates.ts'
export {
  SOCKET_PLATFORM,
  PATH_BOUND_SLUGS,
  platformsForComponent,
  builderPaths,
  makePathVisible,
  pathVisible,
  pathIsOffered,
  pathBoundCategoryIds,
  inferPath,
} from './lib/platforms.ts'
export type { PlatformId, BuilderPath } from './lib/platforms.ts'
export type { BuilderDesign } from './lib/builder-designs.ts'
export type { SpecFieldDef, SpecFieldType } from './lib/spec-templates.ts'

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
  /** Custom UI component path for hardware telemetry ribbon and facet filters before components list */
  componentsListHeaderComponent?: string
  /** Custom UI component path for elevated build stats analytics view */
  buildStatsViewComponent?: string
  /** Custom UI component path for elevated compatibility rules matrix manager view */
  ruleManagerViewComponent?: string
  /** Custom UI component path for templates telemetry ribbon and facet filters before build templates list */
  templatesListHeaderComponent?: string
  /** Custom UI component path for configured builds telemetry ribbon and facet filters before configured builds list */
  configuredBuildsListHeaderComponent?: string
  /** Custom UI component path for component categories telemetry ribbon and facet filters before component categories list */
  componentCategoriesListHeaderComponent?: string
  /** Custom UI component path for the elevated builder-settings edit header (entry 110) */
  builderSettingsHeaderComponent?: string
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
      resolveStockUnits: resolveConfiguredBuildStockUnits,
    })
    setPowerDefaults(pluginOptions.powerDefaults)

    const componentCategoriesCollection = pluginOptions.componentCategoriesListHeaderComponent
      ? {
          ...ComponentCategories,
          admin: {
            ...ComponentCategories.admin,
            components: {
              ...ComponentCategories.admin?.components,
              beforeList: [
                ...(Array.isArray(ComponentCategories.admin?.components?.beforeList)
                  ? ComponentCategories.admin.components.beforeList
                  : []),
                pluginOptions.componentCategoriesListHeaderComponent,
              ],
            },
          },
        }
      : ComponentCategories

    const componentsCollection = pluginOptions.componentsListHeaderComponent
      ? {
          ...Components,
          admin: {
            ...Components.admin,
            components: {
              ...Components.admin?.components,
              beforeList: [
                ...(Array.isArray(Components.admin?.components?.beforeList)
                  ? Components.admin.components.beforeList
                  : []),
                pluginOptions.componentsListHeaderComponent,
              ],
            },
          },
        }
      : Components

    const buildTemplatesCollection = pluginOptions.templatesListHeaderComponent
      ? {
          ...BuildTemplates,
          admin: {
            ...BuildTemplates.admin,
            components: {
              ...BuildTemplates.admin?.components,
              beforeList: [
                ...(Array.isArray(BuildTemplates.admin?.components?.beforeList)
                  ? BuildTemplates.admin.components.beforeList
                  : []),
                pluginOptions.templatesListHeaderComponent,
              ],
            },
          },
        }
      : BuildTemplates

    const configuredBuildsCollection = pluginOptions.configuredBuildsListHeaderComponent
      ? {
          ...ConfiguredBuilds,
          admin: {
            ...ConfiguredBuilds.admin,
            components: {
              ...ConfiguredBuilds.admin?.components,
              beforeList: [
                ...(Array.isArray(ConfiguredBuilds.admin?.components?.beforeList)
                  ? ConfiguredBuilds.admin.components.beforeList
                  : []),
                pluginOptions.configuredBuildsListHeaderComponent,
              ],
            },
          },
        }
      : ConfiguredBuilds

    const builderSettingsGlobal = pluginOptions.builderSettingsHeaderComponent
      ? {
          ...BuilderSettings,
          admin: {
            ...BuilderSettings.admin,
            components: {
              ...BuilderSettings.admin?.components,
              elements: {
                ...BuilderSettings.admin?.components?.elements,
                Description: pluginOptions.builderSettingsHeaderComponent,
              },
            },
          },
        }
      : BuilderSettings

    return {
      ...incomingConfig,
      // Inject the Builder tab into the shop's products collection (A1 linkage).
      collections: [
        ...(incomingConfig.collections || []).map((c) => (c.slug === 'products' ? withBuilderTab(c) : c)),
        componentCategoriesCollection,
        componentsCollection,
        CompatibilityRules,
        DerivedPowerRules,
        buildTemplatesCollection,
        configuredBuildsCollection,
      ],
      globals: [...(incomingConfig.globals ?? []), builderSettingsGlobal],
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
            '../../../packages/plugin-pc-builder/src/admin/BuilderSettingsNavLink#BuilderSettingsNavLink',
          ],
          views: {
            ...incomingConfig.admin?.components?.views,
            ruleManager: {
              type: 'custom',
              path: '/compatibility-rules-manager',
              // Specifier is resolved relative to the config's importMap baseDir (apps/web/src)
              Component:
                pluginOptions.ruleManagerViewComponent ??
                '../../../packages/plugin-pc-builder/src/admin/RuleManagerView#RuleManagerView',
            } as never,
            buildStats: {
              type: 'custom',
              path: '/build-stats',
              Component:
                pluginOptions.buildStatsViewComponent ??
                '../../../packages/plugin-pc-builder/src/admin/BuildStatsView#BuildStatsView',
            } as never,
          },
        },
      },
    }
  }

export default pcBuilderPlugin

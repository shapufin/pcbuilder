import type { Block, Config, Plugin } from 'payload'
import { MegaMenu } from './globals/MegaMenu.ts'
import { SiteSettings } from './globals/SiteSettings.ts'
import { Theme } from './globals/Theme.ts'
import { categoryTopBlocksPlugin } from './plugins/category-top-blocks.ts'
import { seoFieldsPlugin } from './plugins/seo-fields.ts'
import { pageBlocks } from './blocks/definitions.ts'

export interface PagesPluginOptions {
  /** Enable or disable the plugin. @default true */
  enabled?: boolean
}

const mergeBlocks = (existing: Block[] | undefined, incoming: Block[]): Block[] => {
  const seen = new Set((existing ?? []).map((b) => b.slug))
  return [...(existing ?? []), ...incoming.filter((b) => !seen.has(b.slug))]
}

/**
 * plugin-pages — site settings global, page SEO fields, category top-block
 * zone, and the payload block definitions (entry 19, Phase 5 Step B; entry 22
 * block system v2). React rendering (registry/PageRenderer) stays in apps/web —
 * this package holds pure payload config only (05-plugin-contracts.md boundary
 * rules).
 *
 * Entry 22: every block is registered once in `config.blocks` so fields can
 * reference it by slug (`blockReferences`). That registration happens even when
 * `enabled: false` — the app's Pages layout, the topBlocks zone and the
 * RichTextBlock Lexical BlocksFeature all resolve slugs against `config.blocks`
 * and hard-fail or silently empty out without it. `enabled: false` gates the
 * behavioral pieces (globals, SEO wrapper, topBlocks patch) only.
 *
 * Plugin order note: run seoFieldsPlugin last — it renames the `meta` group
 * plugin-seo adds, and topBlocks is independent (categories vs pages).
 */
export const pagesPlugin =
  (pluginOptions: PagesPluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config | Promise<Config> => {
    // Blocks first: sanitizeConfig processes config.blocks before collections,
    // and RichTextBlock's field editor resolves embed slugs against it.
    const withBlocks: Config = {
      ...incomingConfig,
      blocks: mergeBlocks(incomingConfig.blocks, pageBlocks),
    }
    if (pluginOptions.enabled === false) return withBlocks
    const withGlobals: Config = {
      ...withBlocks,
      globals: [...(withBlocks.globals ?? []), SiteSettings, Theme, MegaMenu],
    }
    return seoFieldsPlugin()(categoryTopBlocksPlugin()(withGlobals))
  }

export { DEFAULT_SITE_SETTINGS, isSafeNavLinkUrl, resolveSiteSettings } from './lib/site-settings.ts'
export type { NavLink, SiteSettings } from './lib/site-settings.ts'
export { DEFAULT_MEGA_MENU, MEGA_MENU_ICONS, resolveMegaMenu } from './lib/mega-menu.ts'
export type { MegaMenu, MegaMenuIcon, MegaMenuItem, MegaMenuPromo, MegaMenuSection } from './lib/mega-menu.ts'
export {
  DEFAULT_THEME,
  LIGHT_COLORS,
  THEME_PRESETS,
  altThemePreset,
  buildThemeCss,
  resolveTheme,
  themePresetOptions,
  validateColor,
  validateFont,
  validateRadius,
} from './lib/theme.ts'
export type { Theme, ThemeColors, ThemePreset, ThemePresetDef } from './lib/theme.ts'
export { pageBlocks } from './blocks/definitions.ts'
export { columnChildSlugs, lexicalEmbedBlockSlugs, pageBlockSlugs, sectionChildSlugs } from './blocks/slugs.ts'

export default pagesPlugin

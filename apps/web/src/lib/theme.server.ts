import { getPayloadClient } from './shop'
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  buildThemeCss,
  resolveTheme,
  type ThemePresetDef,
} from '@buildmyrig/plugin-pages'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Server-side reader for the `theme` global (entry 21, Step C). Never
 * throws: the root layout renders at build time for ISR routes, so a
 * missing/unavailable DB must not break the page — default theme covers it.
 */
export async function getThemeCss(): Promise<string> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'theme' })
    return buildThemeCss(resolveTheme(doc))
  } catch (err) {
    console.error('[theme] falling back to default theme:', err)
    return buildThemeCss(DEFAULT_THEME)
  }
}

// Skin files are static per deployment — read each once. Trade-off: editing
// a skin while the dev server runs needs a restart to take effect.
const skinCache = new Map<string, string>()

const loadSkin = (skin: string): string => {
  // Registry values are code constants, but keep the specifier strict —
  // `skins/*` export patterns would let `../` traverse if this ever loosens.
  if (!/^[\w-]+\.css$/.test(skin)) return ''
  const cached = skinCache.get(skin)
  if (cached !== undefined) return cached
  const req = createRequire(path.join(process.cwd(), 'package.json'))
  const css = fs.readFileSync(req.resolve(`@buildmyrig/ui/skins/${skin}`), 'utf8')
  // A literal </style> inside the overlay would break out of the inline tag.
  const safe = css.toLowerCase().includes('</style') ? '' : css
  skinCache.set(skin, safe)
  return safe
}

/**
 * Skin overlay for the active preset (entry 49 design-swap). A preset may
 * name a CSS file in @buildmyrig/ui/skins/ — the layout inlines it after
 * #theme-vars so its rules win the cascade. Never throws: no skin or any
 * failure -> '' and the page just skips the overlay.
 */
export async function getThemeSkinCss(): Promise<string> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'theme' })
    const def = THEME_PRESETS[resolveTheme(doc).preset] as ThemePresetDef
    return def.skin ? loadSkin(def.skin) : ''
  } catch (err) {
    console.error('[theme] skin load failed, skipping overlay:', err)
    return ''
  }
}

/**
 * Vars + skin in one `findGlobal` — the layout calls this once per render
 * (entry-49 review: the split getters read the global twice).
 */
export async function getThemeAssets(): Promise<{ css: string; skin: string }> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'theme' })
    const resolved = resolveTheme(doc)
    const skin = (THEME_PRESETS[resolved.preset] as ThemePresetDef).skin
    return { css: buildThemeCss(resolved), skin: skin ? loadSkin(skin) : '' }
  } catch (err) {
    console.error('[theme] falling back to default theme:', err)
    return { css: buildThemeCss(DEFAULT_THEME), skin: '' }
  }
}

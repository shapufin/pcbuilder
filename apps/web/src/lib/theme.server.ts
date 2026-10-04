import { getPayloadClient } from './shop'
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  altThemePreset,
  buildThemeCss,
  resolveTheme,
  type ThemePresetDef,
} from '@buildmyrig/plugin-pages'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

// cwd-independent fallback: import.meta.url is a real file URL in both
// vitest sources and Turbopack output chunks — walk up to the first
// node_modules carrying the package. Only reached when the primary
// require.resolve path fails (e.g. `next start` launched outside the app
// dir); turbopackIgnore keeps the fallback out of output tracing — the
// primary path already traces skins/* correctly when it resolves.
const findUiSkinsDir = (): string | null => {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (;;) {
    const candidate = path.join(dir, 'node_modules', '@buildmyrig', 'ui', 'skins')
    if (fs.existsSync(/* turbopackIgnore: true */ candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

const loadSkin = (skin: string): string => {
  // Registry values are code constants, but keep the specifier strict —
  // `skins/*` export patterns would let `../` traverse if this ever loosens.
  if (!/^[\w-]+\.css$/.test(skin)) return ''
  const cached = skinCache.get(skin)
  if (cached !== undefined) return cached
  // Primary: a real (non-module-anchored) require so Turbopack leaves the
  // resolve call alone — anchoring at import.meta.url makes the bundler
  // remap resolve() to module ids / try to place the css as a chunk asset.
  const req = createRequire(path.join(process.cwd(), 'package.json'))
  let css = ''
  try {
    css = fs.readFileSync(req.resolve(`@buildmyrig/ui/skins/${skin}`), 'utf8')
  } catch {
    const dir = findUiSkinsDir()
    if (dir) css = fs.readFileSync(path.join(/* turbopackIgnore: true */ dir, skin), 'utf8')
  }
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
 * Blocking no-FOUC script the layout inlines after the theme <style> tags
 * (entry 60): if the visitor picked the alt preset, flip the media attrs
 * so the default pair is inert and #theme-alt applies — before first
 * paint. ThemeToggle duplicates this flip client-side (a raw inline
 * script can't share module imports).
 */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('bmr_theme')==='alt'){var d=document;d.getElementById('theme-vars').media='not all';var s=d.getElementById('theme-skin');if(s)s.media='not all';d.getElementById('theme-alt').media='all';}}catch(e){}`

/**
 * Vars + skin in one `findGlobal` — the layout calls this once per render
 * (entry-49 review: the split getters read the global twice).
 *
 * `altCss` (entry 60) is the visitor-toggle counterpart preset rendered
 * inert as #theme-alt: altThemePreset() picks the pair, the alt preset's
 * OWN colors/extras ship (admin overrides don't transfer), and the
 * admin's radius/fonts are kept so toggling doesn't shift type/layout.
 * 'light'/'dark' ship no skin, so the alt block needs none.
 */
export async function getThemeAssets(): Promise<{
  css: string
  skin: string
  altCss: string
  altLabel: string
  defaultLabel: string
}> {
  let resolved
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'theme' })
    resolved = resolveTheme(doc)
  } catch (err) {
    console.error('[theme] falling back to default theme:', err)
    resolved = DEFAULT_THEME
  }
  // A missing/corrupt skin file only skips the overlay — the resolved preset
  // vars must still apply (entry-55 review: a loadSkin throw used to drop
  // into the shared catch and silently revert the admin's pick to rig-dark).
  const skinName = (THEME_PRESETS[resolved.preset] as ThemePresetDef).skin
  let skin = ''
  if (skinName) {
    try {
      skin = loadSkin(skinName)
    } catch (err) {
      console.error('[theme] skin load failed, skipping overlay:', err)
    }
  }
  const altPreset = altThemePreset(resolved.preset)
  const altCss = buildThemeCss({
    ...resolveTheme({ preset: altPreset }),
    radius: resolved.radius,
    fonts: resolved.fonts,
  })
  return {
    css: buildThemeCss(resolved),
    skin,
    altCss,
    altLabel: (THEME_PRESETS[altPreset] as ThemePresetDef).label,
    defaultLabel: (THEME_PRESETS[resolved.preset] as ThemePresetDef).label,
  }
}

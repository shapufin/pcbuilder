/**
 * Immersive chrome (entry 131) — /builder/configure is a full-screen studio:
 * the design renders the page's only header, so the site header/footer/promo
 * bar must not stack on top of it. The mockups are exactly that, and the
 * stacked version showed two brands and two banner landmarks on one screen.
 *
 * The decision has to happen BEFORE first paint (a post-hydration hide would
 * flash the site chrome), so the root layout ships CHROME_BOOT_SCRIPT inline —
 * same pattern as THEME_BOOT_SCRIPT — and CSS does the hiding. The predicate
 * below is the single source of truth and is unit-tested.
 */
export const IMMERSIVE_PATHS = ['/builder/configure'] as const

export const isImmersivePath = (pathname: string | null | undefined): boolean => {
  if (!pathname) return false
  const path = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  return IMMERSIVE_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

/** Runs inside <body> before the chrome markup is parsed. */
export const CHROME_BOOT_SCRIPT =
  `try{var p=location.pathname.split('?')[0].split('#')[0].replace(/\\/+$/,'')||'/';` +
  `if(${JSON.stringify(IMMERSIVE_PATHS)}.some(function(x){return p===x||p.indexOf(x+'/')===0}))` +
  `{document.body.dataset.chrome='immersive'}}catch(e){}`

/**
 * Client-side sync (round-2 audit F1). The boot script only runs on full
 * loads: a client nav INTO /builder/configure left the site chrome stacked
 * on the design's header, and a nav OUT left 'immersive' set — hiding the
 * site header/footer on every page until a reload. The layout's
 * <ChromeSync/> calls this on every pathname change; it is the only place
 * the attribute is cleared.
 */
export const syncChrome = (
  pathname: string | null | undefined,
  target: { dataset: Record<string, string | undefined> },
): void => {
  if (isImmersivePath(pathname)) target.dataset.chrome = 'immersive'
  else delete target.dataset.chrome
}

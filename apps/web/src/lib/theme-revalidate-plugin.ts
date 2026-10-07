import type { Config, Plugin } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Entry 71 — globals that feed the site chrome (theme preset + pack,
 * site-settings nav/announcements, mega-menu flyout) are read at layout/page
 * render under ISR, so a save used to take up to the route's revalidate
 * window to appear. Revalidating the layout on save makes the swap
 * apply immediately. The try/catch keeps a stray call context (e.g. a seed
 * script running outside a request scope) from failing the save.
 */
const revalidateLayout = (): void => {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // no request scope — nothing to revalidate yet
  }
}

const CHROME_GLOBALS = new Set(['theme', 'site-settings', 'mega-menu'])

export const themeRevalidatePlugin = (): Plugin =>
  (incomingConfig: Config): Config => ({
    ...incomingConfig,
    globals: (incomingConfig.globals ?? []).map((g) =>
      CHROME_GLOBALS.has(g.slug)
        ? {
            ...g,
            hooks: {
              ...(g.hooks ?? {}),
              afterChange: [...(g.hooks?.afterChange ?? []), revalidateLayout],
            },
          }
        : g,
    ),
  })

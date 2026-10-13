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

const revalidateProductDoc = ({ doc }: { doc?: { slug?: string } }): void => {
  try {
    if (doc?.slug) {
      revalidatePath(`/product/${doc.slug}`)
    }
    revalidatePath('/shop')
  } catch {
    // no request scope
  }
}

const revalidateCategoryDoc = ({ doc }: { doc?: { slug?: string } }): void => {
  try {
    if (doc?.slug) {
      revalidatePath(`/shop/${doc.slug}`)
    }
    revalidatePath('/shop')
  } catch {
    // no request scope
  }
}

const revalidateReviewDoc = async ({
  doc,
  req,
}: {
  doc?: { product?: number | { slug?: string } }
  req?: { payload?: { findByID: (args: { collection: 'products'; id: number; depth: number }) => Promise<{ slug?: string }> } }
}): Promise<void> => {
  try {
    if (typeof doc?.product === 'object' && doc.product?.slug) {
      revalidatePath(`/product/${doc.product.slug}`)
    } else if (typeof doc?.product === 'number' && req?.payload) {
      const prod = await req.payload.findByID({ collection: 'products', id: doc.product, depth: 0 })
      if (prod?.slug) {
        revalidatePath(`/product/${prod.slug}`)
      }
    }
  } catch {
    // no request scope
  }
}

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
    collections: (incomingConfig.collections ?? []).map((c) => {
      if (c.slug === 'products') {
        return {
          ...c,
          hooks: {
            ...(c.hooks ?? {}),
            afterChange: [...(c.hooks?.afterChange ?? []), revalidateProductDoc],
          },
        }
      }
      if (c.slug === 'categories') {
        return {
          ...c,
          hooks: {
            ...(c.hooks ?? {}),
            afterChange: [...(c.hooks?.afterChange ?? []), revalidateCategoryDoc],
          },
        }
      }
      if (c.slug === 'reviews') {
        return {
          ...c,
          hooks: {
            ...(c.hooks ?? {}),
            afterChange: [...(c.hooks?.afterChange ?? []), revalidateReviewDoc],
          },
        }
      }
      return c
    }),
  })


import type { GlobalConfig } from 'payload'
import { isManager } from '../lib/access.ts'
import { builderDesignOptions, DEFAULT_BUILDER_DESIGN } from '../lib/builder-designs.ts'

/**
 * Builder settings — the PC builder plugin's own admin surface (entry 50),
 * like WooCommerce composite-product settings: design choices live with the
 * plugin, not the site-wide Theme global. Public read (the storefront resolves
 * it while rendering /builder/configure); manager+ write per the access matrix.
 */
export const BuilderSettings: GlobalConfig = {
  slug: 'builder-settings',
  label: 'Builder settings',
  admin: {
    group: 'PC Builder',
  },
  access: {
    read: () => true,
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  fields: [
    {
      name: 'design',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_BUILDER_DESIGN,
      options: builderDesignOptions(),
      admin: {
        // Generated from the registry so the admin never lists a stale set
        // (entry 131). A clickable gallery needs a ui-field with its own
        // FieldProvider — useField/useFormFields have no context on this
        // global's field (see the builder-themes audit, round 1c).
        description: `Storefront renderer for /builder/configure — swap takes effect on next render, no deploy. Available: ${builderDesignOptions()
          .map((o) => o.label)
          .join(' · ')}.`,
      },
    },
  ],
}

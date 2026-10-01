import type { Field, GlobalConfig } from 'payload'
import { isManager } from '../lib/access.ts'
import { DEFAULT_SITE_SETTINGS, isSafeNavLinkUrl } from '../lib/site-settings.ts'

const linkFields: Field[] = [
  { name: 'label', type: 'text', label: 'Label', required: true, maxLength: 60, admin: { width: 35 } },
  {
    name: 'url',
    type: 'text',
    label: 'URL',
    required: true,
    maxLength: 2048,
    admin: { width: 65 },
    // Same rule the renderer enforces (resolveSiteSettings) — fail early in
    // the admin form instead of silently dropping the row on the storefront.
    validate: (value: unknown) => {
      if (typeof value !== 'string' || !value.trim()) return 'URL is required'
      return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
    },
  },
]

/**
 * Step A (entry 18): header/footer links admin-editable. The resolver in
 * `lib/site-settings.ts` falls back to DEFAULT_SITE_SETTINGS while the
 * global doc does not exist yet (fresh DB), so the storefront keeps working
 * before anyone opens the admin form.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  access: {
    read: () => true,
    update: isManager,
  },
  fields: [
    {
      name: 'navLinks',
      type: 'array',
      label: 'Header links',
      defaultValue: DEFAULT_SITE_SETTINGS.navLinks,
      admin: {
        description: 'Shown in the site header. Empty list = no header links (Shop/Builder are not structural).',
      },
      fields: linkFields,
    },
    {
      name: 'footerLinks',
      type: 'array',
      label: 'Footer links',
      defaultValue: DEFAULT_SITE_SETTINGS.footerLinks,
      fields: linkFields,
    },
  ],
}

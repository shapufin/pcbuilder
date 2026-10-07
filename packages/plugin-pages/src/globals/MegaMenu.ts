import type { GlobalConfig } from 'payload'
import { isManager } from '../lib/access.ts'
import { isSafeNavLinkUrl } from '../lib/site-settings.ts'
import { MEGA_MENU_ICONS } from '../lib/mega-menu.ts'

const safeUrl = (value: unknown): true | string => {
  if (typeof value !== 'string' || !value.trim()) return 'URL is required'
  return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
}

/**
 * Entry 71 (Nexus) — the catalog mega-menu flyout, admin-editable (replaces
 * the source app's React-state AdminMegaMenuModal). Replaces nothing: the
 * top nav still comes from `site-settings.navLinks`; this global only feeds
 * the Nexus header's flyout panels. The resolver (`lib/mega-menu.ts`)
 * re-validates every URL/icon on the way out.
 */
export const MegaMenu: GlobalConfig = {
  slug: 'mega-menu',
  label: 'Mega menu',
  admin: {
    description: 'Nexus header flyout — sections, items and the featured promo card.',
    group: 'Settings & Design',
  },
  access: {
    read: () => true,
    update: isManager,
  },
  fields: [
    {
      name: 'menuPreview',
      type: 'ui',
      admin: {
        components: {
          Field: '../../../packages/plugin-pages/src/admin/MegaMenuPreview#MegaMenuPreview',
        },
      },
    },
    {
      name: 'sections',
      type: 'array',
      label: 'Flyout sections',
      admin: {
        description: 'Empty list = mega-menu trigger hidden.',
        components: {
          RowLabel: '../../../packages/plugin-pages/src/admin/MegaMenuRowLabel#MegaMenuRowLabel',
        },
      },
      fields: [
        { name: 'title', type: 'text', required: true, maxLength: 60 },
        { name: 'description', type: 'textarea', maxLength: 200 },
        {
          name: 'url',
          type: 'text',
          label: 'Section link URL',
          maxLength: 2048,
          validate: (value: unknown) =>
            value === undefined || value === null || value === '' ? true : safeUrl(value),
          admin: { description: 'Where the section title links (default /shop).', placeholder: '/shop' },
        },
        {
          name: 'items',
          type: 'array',
          label: 'Items',
          admin: {
            components: {
              RowLabel: '../../../packages/plugin-pages/src/admin/MegaMenuRowLabel#MegaMenuRowLabel',
            },
          },
          fields: [
            { name: 'label', type: 'text', required: true, maxLength: 60, admin: { width: 40 } },
            { name: 'url', type: 'text', required: true, maxLength: 2048, validate: safeUrl, admin: { width: 60 } },
            { name: 'subtitle', type: 'text', maxLength: 200 },
            { name: 'badge', type: 'text', maxLength: 40, admin: { width: 30 } },
            {
              name: 'icon',
              type: 'select',
              options: MEGA_MENU_ICONS.map((i) => ({ label: i, value: i })),
              admin: { width: 30 },
            },
          ],
        },
        {
          name: 'featuredPromo',
          type: 'group',
          label: 'Featured promo card',
          fields: [
            { name: 'title', type: 'text', maxLength: 80 },
            { name: 'description', type: 'textarea', maxLength: 400 },
            { name: 'buttonText', type: 'text', maxLength: 60, admin: { width: 40 } },
            {
              name: 'url',
              type: 'text',
              maxLength: 2048,
              // Optional: the resolver drops promos without a url. Must accept
              // empty — Payload validates omitted group subfields too (a bare
              // safeUrl made every promo-less section unsavable, breaking the
              // entry-71 seed).
              validate: (value: unknown) =>
                value === undefined || value === null || value === '' ? true : safeUrl(value),
              admin: { width: 60 },
            },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
  ],
}

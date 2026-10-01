import type { Field, GlobalConfig } from 'payload'
import { isManager } from '../lib/access.ts'
import { validateColor, validateFont, validateRadius } from '../lib/theme.ts'

/**
 * Empty/missing values are valid: they mean "use the preset default"
 * (resolveTheme falls back). Only non-empty values hit the strict charset
 * check - payload validates omitted fields as empty on partial updates too.
 */
const optionalField =
  (check: (v: unknown) => boolean, message: string) =>
  (value: unknown): true | string => {
    const empty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
    return empty || check(value) ? true : message
  }

const colorField = (name: string, label: string): Field => ({
  name,
  type: 'text',
  label,
  admin: { width: 50, placeholder: '#6366f1' },
  validate: optionalField(validateColor, 'Enter a hex color, e.g. #6366f1'),
})

const radiusField = (name: string, label: string): Field => ({
  name,
  type: 'text',
  label,
  admin: { width: 50, placeholder: '8px' },
  validate: optionalField(validateRadius, 'Enter a CSS length, e.g. 8px / 0.5rem'),
})

const fontField = (name: string, label: string): Field => ({
  name,
  type: 'text',
  label,
  admin: { width: 100 },
  validate: optionalField(validateFont, 'Enter a font stack (letters, spaces, commas, quotes only)'),
})

/**
 * Step C (entry 21) - hand-rolled theme global. Empty fields fall back to
 * the chosen preset in resolveTheme (lib/theme.ts); only managers/admins
 * may write (mirrors SiteSettings). Values are re-validated in the resolver
 * because they land in an inline <style> block.
 */
export const Theme: GlobalConfig = {
  slug: 'theme',
  label: 'Theme',
  access: {
    read: () => true,
    update: isManager,
  },
  fields: [
    {
      name: 'preset',
      type: 'select',
      label: 'Preset',
      defaultValue: 'dark',
      options: [
        { label: 'Dark', value: 'dark' },
        { label: 'Light', value: 'light' },
      ],
      admin: { description: 'Empty color fields fall back to this preset.' },
    },
    {
      name: 'colors',
      type: 'group',
      label: 'Colors',
      admin: { description: 'Leave a field empty to use the preset value.' },
      fields: [
        colorField('bg', 'Background'),
        colorField('surface', 'Surface'),
        colorField('surfaceRaised', 'Raised surface'),
        colorField('surfaceHover', 'Raised surface hover'),
        colorField('border', 'Border'),
        colorField('borderStrong', 'Strong border'),
        colorField('text', 'Text'),
        colorField('textMuted', 'Muted text'),
        colorField('primary', 'Primary'),
        colorField('primaryStrong', 'Primary strong'),
        colorField('primaryHover', 'Primary hover'),
        colorField('primaryHoverStrong', 'Primary strong hover'),
        colorField('onPrimary', 'Text on primary'),
        colorField('success', 'Success'),
        colorField('successStrong', 'Success surface'),
        colorField('warning', 'Warning'),
        colorField('danger', 'Danger'),
        colorField('info', 'Info'),
      ],
    },
    {
      name: 'radius',
      type: 'group',
      label: 'Radius',
      admin: { description: 'Corner radii for buttons/cards/inputs.' },
      fields: [radiusField('sm', 'Small'), radiusField('md', 'Medium'), radiusField('lg', 'Large')],
    },
    {
      name: 'fonts',
      type: 'group',
      label: 'Fonts',
      admin: { description: 'Font stacks; empty = preset default.' },
      fields: [fontField('body', 'Body'), fontField('heading', 'Heading'), fontField('mono', 'Monospace')],
    },
  ],
}

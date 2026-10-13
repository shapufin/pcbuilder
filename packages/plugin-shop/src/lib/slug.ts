/**
 * Slug generation shared by the products `slug` field hook and the admin
 * SlugField component's server-side fallback. ASCII-folded, lowercase,
 * hyphen-separated — punctuation and duplicate separators collapse.
 */
export const slugify = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

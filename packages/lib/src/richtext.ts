/**
 * Framework-free rich-text helpers for server rendering
 * (FAQ JSON-LD answers, video embeds — 10-blocks-pages.md blocks).
 */

type LexicalNode = {
  text?: unknown
  children?: unknown[]
}

/**
 * Flatten a Lexical document to plain text (walks nested children).
 * Returns '—' when there is no text content (placeholder for JSON-LD).
 */
export const lexicalToPlainText = (doc: unknown): string => {
  // Lexical docs wrap content in { root: { children: [...] } }.
  const root = doc && typeof doc === 'object' && 'root' in doc ? (doc as { root: unknown }).root : doc
  const collect = (node: unknown, out: string[]): void => {
    if (!node || typeof node !== 'object') return
    const n = node as LexicalNode
    if (typeof n.text === 'string') out.push(n.text)
    if (Array.isArray(n.children)) n.children.forEach((child) => collect(child, out))
  }
  const children = (root && typeof root === 'object' && Array.isArray((root as LexicalNode).children)
    ? (root as LexicalNode).children
    : [root]) as unknown[]
  const blocks = children
    .map((child) => {
      const out: string[] = []
      collect(child, out)
      return out.join('')
    })
    .filter(Boolean)
  return blocks.join(' ').trim() || '—'
}

/**
 * Normalize a YouTube/Vimeo page URL to its embeddable player URL.
 * Returns null when the URL cannot be parsed or has no usable id.
 */
export const embedUrlFrom = (
  provider: 'youtube' | 'vimeo',
  url: string,
): string | null => {
  try {
    const u = new URL(url)
    if (provider === 'youtube') {
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.slice(1)
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      const id = u.searchParams.get('v') ?? u.pathname.split('/').filter(Boolean).pop()
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    return null
  }
  return null
}

/**
 * Detect the provider from the URL host and return an embeddable player URL.
 * Returns null for unknown hosts or unparseable input.
 */
export const embedUrlFor = (url: string): string | null => {
  try {
    const host = new URL(url).hostname
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) return embedUrlFrom('youtube', url)
    if (/(^|\.)vimeo\.com$/.test(host)) return embedUrlFrom('vimeo', url)
    return null
  } catch {
    return null
  }
}

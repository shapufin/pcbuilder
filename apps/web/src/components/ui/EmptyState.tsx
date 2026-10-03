import type { ReactNode } from 'react'

/**
 * Designed empty state — replaces the plain "Nothing yet…" paragraphs
 * across cart/wishlist/account/search.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {action}
    </div>
  )
}

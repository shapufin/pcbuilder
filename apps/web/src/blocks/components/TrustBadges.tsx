import type { TrustBadgesBlock as TrustBadgesBlockType } from '@/payload-types'

const iconGlyph = (iconName?: string | null): string => {
  switch (iconName) {
    case 'shield-check':
    case 'shield':
      return '🛡️'
    case 'truck':
      return '🚀'
    case 'cpu':
      return '⚡'
    case 'headphones':
      return '🎧'
    case 'award':
      return '🏆'
    case 'zap':
      return '⚡'
    case 'check':
    default:
      return '✨'
  }
}

export function TrustBadges({ block }: { block: Partial<TrustBadgesBlockType> }) {
  const items = block.items ?? []
  if (items.length === 0) return null

  return (
    <section className="blk">
      {block.eyebrow && <p className="blk__lead" style={{ textAlign: 'center', marginBottom: 'var(--space-1)' }}>{block.eyebrow}</p>}
      {block.heading && <h2 className="blk__title blk--center">{block.heading}</h2>}
      <div className="blk-trust-badges">
        {items.map((item, idx) => (
          <div key={idx} className="blk-trust-card" data-style={block.style || 'glass'}>
            <span className="blk-trust-card__icon" aria-hidden="true">
              {iconGlyph(item.icon)}
            </span>
            <div className="blk-trust-card__body">
              <h3 className="blk-trust-card__title">{item.title}</h3>
              {item.subtitle && <p className="blk-trust-card__subtitle">{item.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

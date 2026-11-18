import type { ComponentType } from 'react'
import {
  Award,
  Check,
  Cpu,
  Headphones,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react'
import type { TrustBadgesBlock as TrustBadgesBlockType } from '@/payload-types'

/** Icon name -> lucide component. Emoji glyphs are banned in UI (no-emoji
 *  doctrine); lucide is already the house icon set. */
const iconFor = (iconName?: string | null): ComponentType<{ size?: number }> => {
  switch (iconName) {
    case 'shield-check':
    case 'shield':
      return ShieldCheck
    case 'truck':
      return Truck
    case 'cpu':
      return Cpu
    case 'headphones':
      return Headphones
    case 'award':
      return Award
    case 'zap':
      return Zap
    case 'check':
    default:
      return Check
  }
}

export function TrustBadges({ block }: { block: Partial<TrustBadgesBlockType> }) {
  const items = block.items ?? []
  if (items.length === 0) return null

  return (
    <section className="blk">
      {block.eyebrow && <p className="blk__lead trust-badges-x-1">{block.eyebrow}</p>}
      {block.heading && <h2 className="blk__title blk--center">{block.heading}</h2>}
      <div className="blk-trust-badges">
        {items.map((item, idx) => {
          const Icon = iconFor(item.icon)
          return (
            <div key={idx} className="blk-trust-card" data-style={block.style || 'glass'}>
              <span className="blk-trust-card__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <div className="blk-trust-card__body">
                <h3 className="blk-trust-card__title">{item.title}</h3>
                {item.subtitle && <p className="blk-trust-card__subtitle">{item.subtitle}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
